namespace Sota {
  export type Role = 'anon' | 'normal_user' | 'admin_user' | 'super_admin';
  export type Kind = 'museum' | 'artifact' | 'exhibit' | 'ticket' | 'product';
  export type Fields = Record<string, string>;
  export interface Item {
    id: string; kind: Kind; museum: string; name: string; status: string;
    fields: Fields; links: string[]; source?: { code: string; url: string; rights: string };
  }
  export interface Order {
    id: string; museum: string; kind: 'ticket' | 'shop'; date: string; visit: string;
    slot: string; code: string; status: string; paid: boolean; qty: number; price: number;
    fee: number; product: string; label: string; exhibit?: string; usedAt?: string;
  }
  export interface Asset {id: string; museum: string; target: string; name: string; primary: boolean; sequence: number; url: string; mime: string}

  export function day(offset = 0, now = new Date()) {
    return new Date(now.getTime() + (7 * 60 + offset * 1440) * 60000).toISOString().slice(0, 10);
  }
  const fail = (message: string): never => { throw new Error(message); };
  export function initialItems(): Item[] {
    const item = (kind: Kind, id: string, museum: string, name: string, fields: Fields, status='published'): Item =>
      ({kind,id,museum,name,fields,status,links:[]});
    const exhibit=item('exhibit','e1','m1','Dấu men thời gian',{start:day(-12),end:day(28)});
    exhibit.links=['a1'];
    return [
      item('museum','m1','m1','Bảo tàng Mỹ thuật',{slug:'my-thuat',address:'66 Nguyễn Thái Học, Hà Nội',city:'Hà Nội'}),
      item('museum','m2','m2','Bảo tàng Di sản',{slug:'di-san',city:'Huế',address:'12 Lê Lợi'},'draft'),
      item('artifact','a1','m1','Bình men lam',{code:'BT-001',period:'Thế kỷ XIX'}),
      item('artifact','a2','m1','Tranh khắc phố cổ',{code:'BT-002',period:'Thế kỷ XX'},'draft'), exhibit,
      item('ticket','t1','m1','Vé tiêu chuẩn',{price:'60000'},'available'),
      item('ticket','t2','m1','Vé sinh viên',{price:'30000'},'available'),
      item('product','p1','m1','Bộ bưu thiếp',{code:'BC-01',price:'45000',stock:'18'}),
      item('product','p2','m1','Sổ tay bảo tàng',{code:'ST-01',price:'80000',stock:'12'}),
      item('artifact','a3','m2','Ấn triện',{code:'DS-01',period:'Thế kỷ XIX'})];
  }
  export class Mock {
    role: Role = 'anon';
    active = new Set(['m1']);
    items = initialItems();
    assets: Asset[] = [];
    orders: Order[] = [];
    private nextId = 10;
    constructor() {
      const ticket: Order = {id:'TKT-101',museum:'m1',kind:'ticket',date:day(),visit:day(),slot:'09:00-11:00',code:'SOTA-101',
        status:'confirmed',paid:true,qty:2,price:60000,fee:0,product:'t1',label:'Vé tiêu chuẩn'};
      this.orders=[ticket,{...ticket,id:'TKT-102',code:'SOTA-102',qty:1,slot:'14:00-16:00',visit:day(1),exhibit:'e1'},
        {...ticket,id:'SHP-201',kind:'shop',code:'',qty:2,price:45000,fee:20000,product:'p1',label:'Bộ bưu thiếp'},
        {...ticket,id:'TKT-103',code:'',status:'pending',paid:false}];
    }
    museums() {
      return this.items.filter(x => x.kind==='museum' && (this.role==='super_admin' || (this.role==='admin_user' && this.active.has(x.id))));
    }
    guard(id: string) {
      if(this.role==='anon') fail('Phiên đã hết hạn. Vui lòng chọn lại tài khoản mẫu.');
      if(!this.museums().some(x=>x.id===id)) fail('Bạn không có quyền quản lý bảo tàng này.');
    }
    list(museum: string,kind: Kind) { this.guard(museum); return this.items.filter(x=>x.museum===museum && x.kind===kind); }
    save(museum: string,kind: Kind,id: string,name: string,status: string,fields: Fields,links: string[] = []) {
      this.guard(museum);
      const old=id ? this.list(museum,kind).find(x=>x.id===id) : undefined;
      if(id && !old) fail('Không tìm thấy bản ghi trong bảo tàng.');
      if(kind==='museum' && !id && this.role!=='super_admin') fail('Chỉ quản trị hệ thống được tạo bảo tàng.');
      if(!name.trim()) fail('Nhập tên trước khi lưu.');
      if(!(kind==='ticket'?['available','unavailable']:['draft','published','archived']).includes(status)) fail('Trạng thái không hợp lệ.');
      const unique=kind==='museum'?'slug':'code';
      if(kind==='museum' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug||'')) fail('Slug chỉ gồm chữ thường, số và dấu gạch nối.');
      if(fields[unique] && this.items.some(x=>x.id!==id && x.kind===kind && (kind==='museum' || x.museum===museum) && x.fields[unique]===fields[unique])) fail('Mã hoặc slug đã tồn tại.');
      for(const key of kind==='product'?['price','stock']:kind==='ticket'?['price']:[]) {
        const v=Number(fields[key]);
        if(!fields[key]?.trim() || !Number.isFinite(v) || v<0 || (key==='stock' && !Number.isInteger(v))) fail('Giá và tồn kho phải hợp lệ và không âm.');
      }
      if(kind==='exhibit'){
        if(!fields.start || !fields.end || fields.start>fields.end) fail('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
        if(new Set(links).size!==links.length || links.some(i=>!this.list(museum,'artifact').some(a=>a.id===i && (a.status==='published' || old?.links.includes(i))))) fail('Chọn hiện vật hợp lệ trong bảo tàng.');
      }
      const key=id || 'record-'+this.nextId++;
      const result:Item={...old,id:key,museum:kind==='museum'?key:museum,kind,name:name.trim(),status,fields:{...fields},links:[...links]};
      if(old) this.items[this.items.indexOf(old)]=result; else this.items.push(result);
      return result;
    }
    importSample(museum: string,count: number) {
      this.guard(museum);
      if(![1,2].includes(count)) fail('Chọn một hoặc hai mẫu.');
      let added=0;
      for(const [index,name] of ['Stoneware bowl','Blue textile study'].slice(0,count).entries()){
        const code='MOCK-SI-'+(index+1);
        if(this.list(museum,'artifact').some(a=>a.source?.code===code)) continue;
        const row=this.save(museum,'artifact','',''+name,'draft',{period:'',code:''});
        row.source={code,url:'https://www.si.edu/openaccess',rights:'Mẫu mô phỏng · CC0'}; added++;
      }
      return {added,skipped:count-added};
    }
    queue(museum:string) {this.guard(museum); return this.orders.filter(o=>o.museum===museum);}
    redeem(museum:string,code:string) {
      const order=this.queue(museum).find(o=>o.kind==='ticket' && o.code && o.code===code.trim().toUpperCase());
      if(!order) return fail('Không tìm thấy mã vé trong bảo tàng.');
      if(order.status!=='confirmed') fail('Vé đã sử dụng hoặc chưa được xác nhận.');
      if(order.visit!==day()) fail('Ngày tham quan không phải hôm nay.');
      order.status='used';order.usedAt=new Date().toISOString();
    }
    advance(museum:string,id:string,status:string) {
      const o=this.queue(museum).find(x=>x.id===id);
      if(!o) return fail('Không tìm thấy đơn.');
      if(status==='cancelled' && o.status==='confirmed' && (o.kind==='shop' || o.visit>day())){
        if(o.kind==='shop'){
          const p=this.list(museum,'product').find(x=>x.id===o.product);
          if(!p) return fail('Không tìm thấy sản phẩm để hoàn kho.');
          p.fields.stock=String(Number(p.fields.stock)+o.qty);
        }
      }else if(!(o.kind==='shop' && o.paid && ((status==='shipped' && o.status==='confirmed') || (status==='completed' && o.status==='shipped')))) fail('Đơn không thể chuyển sang trạng thái này.');
      o.status=status;
    }
    report(museum:string,from:string,to:string,exhibit='') {
      if(!from || !to || from>to) fail('Khoảng ngày không hợp lệ.');
      const rows=this.queue(museum).filter(o=>o.kind==='ticket' && o.paid && o.date>=from && o.date<=to && (!exhibit || o.exhibit===exhibit));
      return {rows,qty:rows.reduce((v,o)=>v+o.qty,0),total:rows.reduce((v,o)=>v+o.qty*o.price,0)};
    }
    media(museum:string) {this.guard(museum);return this.assets.filter(a=>a.museum===museum).sort((a,b)=>a.sequence-b.sequence);}
    upload(museum:string,target:string,file:File){
      this.guard(museum);
      if(!this.items.some(x=>x.id===target && x.museum===museum && ['artifact','product'].includes(x.kind))) fail('Chọn hiện vật hoặc sản phẩm trong bảo tàng.');
      const formats:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'video/mp4':['mp4'],'video/webm':['webm']};
      const max=file.type.startsWith('video/')?50:10;
      if(!formats[file.type]?.includes(file.name.split('.').pop()?.toLowerCase()||'') || !file.size || file.size>max*1024*1024) fail('Chọn JPG, PNG, WebP (tối đa 10 MB) hoặc MP4, WebM (50 MB).');
      this.assets.push({id:'media-'+this.nextId++,museum,target,name:file.name,primary:!this.assets.some(a=>a.target===target),sequence:0,url:URL.createObjectURL(file),mime:file.type});
    }
    updateMedia(museum:string,id:string,sequence:number,primary:boolean) {
      const a=this.media(museum).find(x=>x.id===id);
      if(!a || !Number.isInteger(sequence) || sequence<0) return fail('Thứ tự tệp không hợp lệ.');
      if(primary) this.assets.filter(x=>x.target===a.target).forEach(x=>x.primary=false);
      a.primary=primary;a.sequence=sequence;
    }
    removeMedia(museum:string,id:string) {
      const a=this.media(museum).find(x=>x.id===id);
      if(!a) return fail('Không tìm thấy tệp.');
      if(a.url.startsWith('blob:')) URL.revokeObjectURL(a.url);
      this.assets=this.assets.filter(x=>x!==a);
    }
  }
}
