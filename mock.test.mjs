import { beforeEach, describe, expect, it } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const context = vm.createContext({ URL, Date });
vm.runInContext(readFileSync(new URL('./mock.js', import.meta.url), 'utf8'), context);
const { Mock, day } = context.Sota;
let db;
beforeEach(() => { db = new Mock(); db.role = 'admin_user'; });

describe('museum permissions', () => {
  it.each(['anon', 'normal_user'])('denies %s all administrator records', role => {
    db.role = role;
    expect(db.museums()).toHaveLength(0);
    expect(() => db.queue('m1')).toThrow();
  });
  it('requires active membership on every action, including an already opened editor', () => {
    expect(db.museums().map(x => x.id)).toEqual(['m1']);
    expect(() => db.list('m2', 'artifact')).toThrow();
    db.active.delete('m1');
    expect(() => db.save('m1', 'artifact', 'a1', 'New name', 'draft', {})).toThrow();
    expect(() => db.redeem('m1', 'SOTA-101')).toThrow();
    expect(db.items.find(x => x.id === 'a1').name).toBe('Bình men lam');
  });
  it('restricts museum creation to super admins and keeps children scoped', () => {
    const add = () => db.save('m1', 'museum', '', 'New museum', 'draft', {slug:'new'});
    expect(add).toThrow();
    db.role = 'super_admin';
    expect(db.list('m2', 'artifact')).toHaveLength(1);
    const created = add();
    expect(db.list(created.id, 'artifact')).toEqual([]);
    expect(add).toThrow();
    expect(() => db.save('m1','artifact','a3','Edit','draft',{})).toThrow();
  });
});
describe('catalog and course simulations', () => {
  it('archives a museum and retains its related order history', () => {
    const m=db.list('m1','museum')[0];
    db.save('m1','museum',m.id,m.name,'archived',m.fields);
    expect(db.list('m1','museum')[0].status).toBe('archived');
    expect(db.queue('m1')).toHaveLength(4);
  });
  it('validates amounts, integer stock, and per-museum identifiers before saving', () => {
    const add = fields => db.save('m1','product','','Print','published',fields);
    for(const fields of [{price:'-1',stock:'1'}, {price:'0',stock:'1.5'}, {price:'',stock:'1'}, {price:'1',stock:'1',code:'BC-01'}])
      expect(() => add(fields)).toThrow();
    expect(db.list('m1','product')).toHaveLength(2);
    expect(add({price:'0',stock:'0'}).fields.stock).toBe('0');
  });
  it('imports once and preserves source attribution after editing', () => {
    expect(db.importSample('m1',2)).toEqual({added:2,skipped:0});
    expect(db.importSample('m1',2)).toEqual({added:0,skipped:2});
    const a=db.list('m1','artifact').find(row=>row.source);
    expect(db.save('m1','artifact',a.id,'Edited','published',{}).source).toEqual(a.source);
  });
  it('validates exhibition dates and unique same-museum artwork links', () => {
    const edit=(dates,links) => db.save('m1','exhibit','e1','Show','draft',dates,links);
    const dates={start:day(),end:day(5)};
    expect(()=>edit({start:day(),end:day(-1)},[])).toThrow();
    for(const links of [['a3'],['a2'],['a1','a1']]) expect(()=>edit(dates,links)).toThrow();
    expect(edit(dates,[]).links).toEqual([]);
    expect(db.list('m1','artifact')).toHaveLength(2);
  });
  it('stops ticket sales while preserving paid order snapshots', () => {
    const t=db.list('m1','ticket')[0];
    db.save('m1','ticket',t.id,t.name,'unavailable',{price:'90000'});
    expect(db.queue('m1')[0].price).toBe(60000);
  });
});
describe('admissions and fulfillment', () => {
  it('computes visit dates in Vietnam across UTC midnight', () => {
    expect(day(0,new Date('2026-05-01T17:00:00Z'))).toBe('2026-05-02');
  });
  it('admits one confirmed purchase once, only on the visit date', () => {
    expect(()=>db.redeem('m1','SOTA-102')).toThrow();
    expect(()=>db.redeem('m1','')).toThrow();
    expect(()=>db.advance('m1','TKT-101','cancelled')).toThrow();
    db.redeem('m1',' sota-101 ');
    expect(db.queue('m1')[0].usedAt).toBeTruthy();
    expect(()=>db.redeem('m1','SOTA-101')).toThrow();
    db.advance('m1','TKT-102','cancelled');
    expect(db.queue('m1')[1].paid).toBe(true);
  });
  it('only advances paid orders through the next fulfillment state', () => {
    const step = s => db.advance('m1','SHP-201',s);
    const order = db.queue('m1').find(o=>o.kind==='shop');
    expect(()=>step('completed')).toThrow();
    order.paid=false; expect(()=>step('shipped')).toThrow(); order.paid=true;
    step('shipped'); expect(()=>step('cancelled')).toThrow(); step('completed');
    expect(order.qty*order.price+order.fee).toBe(110000);
  });
  it('returns stock once on cancellation while preserving the invoice', () => {
    const cancel=()=>db.advance('m1','SHP-201','cancelled');
    cancel(); expect(cancel).toThrow();
    expect(db.list('m1','product')[0].fields.stock).toBe('20');
    expect(db.queue('m1').find(o=>o.kind==='shop').price).toBe(45000);
  });
  it('counts paid ticket sales once, filters exhibition and handles empty dates', () => {
    expect(db.report('m1',day(-29),day())).toMatchObject({qty:3,total:180000});
    expect(db.report('m1',day(),day(),'e1').qty).toBe(1);
    expect(db.report('m1',day(1),day(1)).rows).toHaveLength(0);
    expect(()=>db.report('m1',day(1),day())).toThrow();
  });
});
describe('media fixtures', () => {
  it('validates target, file extension, MIME type and size before adding a reference', () => {
    const by=(target,file)=>db.upload('m1',target,file);
    const image=new File(['sample'],'a.png',{type:'image/png'});
    expect(()=>by('a3',image)).toThrow();
    expect(()=>by('a1',new File(['x'],'a.gif',{type:'image/png'}))).toThrow();
    expect(()=>by('a1',{type:'image/png',name:'a.png',size:11*1024*1024})).toThrow();
    expect(db.media('m1')).toHaveLength(0);
    by('a1',image); by('a1',image);
    const [a,b]=db.media('m1');
    db.updateMedia('m1',b.id,2,true);
    expect(a.primary).toBe(false);
    expect(b.primary).toBe(true);
    db.removeMedia('m1',b.id);
    expect(db.media('m1')).toEqual([a]);
    db.removeMedia('m1',a.id);
  });
});
