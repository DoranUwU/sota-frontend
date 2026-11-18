'use strict';
const db = new Sota.Mock();
const pages = {home:'Tổng quan',museum:'Bảo tàng',artifact:'Hiện vật',exhibit:'Triển lãm',ticket:'Loại vé',gate:'Soát vé',product:'Lưu niệm',order:'Đơn hàng',media:'Thư viện media',report:'Thống kê'};
const statuses={draft:'Bản nháp',published:'Đã xuất bản',archived:'Đã lưu trữ',available:'Đang bán',unavailable:'Ngừng bán',confirmed:'Đã xác nhận',used:'Đã sử dụng',pending:'Chờ thanh toán',cancelled:'Đã hủy',shipped:'Đang giao',completed:'Đã giao'};
const labels={code:'Mã danh mục',period:'Niên đại',description:'Mô tả',stock:'Tồn kho',price:'Giá (VND)',city:'Thành phố',address:'Địa chỉ',slug:'Slug',start:'Ngày bắt đầu',end:'Ngày kết thúc'};
const fields={museum:['slug','city','address','description'],artifact:['code','period','description'],exhibit:['start','end','description'],ticket:['price','description'],product:['code','price','stock','description']};
const single={museum:'bảo tàng',artifact:'hiện vật',exhibit:'triển lãm',ticket:'loại vé',product:'sản phẩm'};
const titles={artifact:'Danh mục hiện vật',exhibit:'Lịch triển lãm',ticket:'Bảng giá vé',product:'Sản phẩm trong kho',museum:'Thông tin bảo tàng'};
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
const opt=(value,label,selected)=>`<option value="${esc(value)}"${value===selected?' selected':''}>${esc(label)}</option>`;
const btn=(action,label,id='',primary=false)=>`<button type="button" data-action="${action}" data-id="${esc(id)}" class="${primary?'primary':''}">${esc(label)}</button>`;
const badge=s=>`<span class="pill ${esc(s)}">${esc(statuses[s]||s)}</span>`;
const empty=label=>`<p class="empty">${esc(label)}</p>`;
const stat=(label,value)=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
const brand='<div class="brand">SOTA<small>QUẢN TRỊ BẢO TÀNG</small></div>';
let museum='',page='home',filter='',visit='',reportDates,dialogSubmit,noticeTimer;
function resetFilters(){filter='';visit='';reportDates={from:Sota.day(-29),to:Sota.day(),exhibit:''};}
resetFilters();
function notice(msg){clearTimeout(noticeTimer);$('#notice').textContent=msg;noticeTimer=setTimeout(()=>$('#notice').textContent='',4500);}
function login(){
 const denied=db.role!=='anon'&&!db.museums().length;
 return `<main id="main"><section class="login">${brand}<h1>Vào trang quản trị</h1><p class="muted">Chọn tài khoản mẫu để thử quyền truy cập. Dữ liệu chỉ tồn tại trong lần mở trang này.</p>${denied?'<p role="alert">Tài khoản này không có quyền quản lý bảo tàng.</p>':''}
 <form id="login"><label>Tài khoản mô phỏng<select name="role">${opt('admin_user','Quản trị bảo tàng','admin_user')}${opt('super_admin','Quản trị hệ thống')}${opt('normal_user','Khách tham quan')}</select></label><button class="primary">Tiếp tục</button></form></section></main>`;
}
function selectMuseum(){
 return `<main id="main"><section class="login">${brand}<h1>Chọn bảo tàng</h1><form id="choose"><label>Bảo tàng quản lý<select name="museum">${db.museums().map(x=>opt(x.id,x.name)).join('')}</select></label><button class="primary">Mở không gian quản trị</button>${btn('logout','Đăng xuất')}</form></section></main>`;
}
function render(){
 const root=$('#app');
 if(!db.museums().length){museum='';root.innerHTML=login();return;}
 if(!db.museums().some(x=>x.id===museum)){museum='';root.innerHTML=selectMuseum();return;}
 const active=db.list(museum,'museum')[0];
 const body=page==='home'?home(active):page==='gate'||page==='order'?orders():page==='media'?media():page==='report'?report():catalog();
 root.innerHTML=`<div class="shell"><aside>${brand}<nav aria-label="Chức năng quản trị">${Object.entries(pages).map(([k,v])=>`<button data-action="nav" data-id="${k}" ${page===k?'aria-current="page"':''}>${v}</button>`).join('')}</nav><div class="foot"><p>${db.role==='super_admin'?'Quản trị hệ thống':'Quản trị bảo tàng'}</p>${btn('logout','Đăng xuất')}</div></aside>
 <main id="main" tabindex="-1"><div class="bar"><label>Bảo tàng quản lý<select id="museum-switch">${db.museums().map(x=>opt(x.id,x.name,museum)).join('')}</select></label><span class="mode">Phiên mô phỏng</span></div>
 <header class="heading"><h1>${pages[page]}</h1>${headingActions()}</header>${body}</main></div>`;
}
function headingActions(){
 if(page==='museum')return `<div class="actions">${db.role==='super_admin'?btn('new','Thêm bảo tàng'):''}${btn('edit','Sửa thông tin',museum,true)}</div>`;
 if(fields[page])return `<div class="actions">${page==='artifact'?btn('import','Nhập mẫu Smithsonian'):''}${btn('new','Thêm '+single[page],'',true)}</div>`;
 if(page==='gate')return btn('redeem','Nhập mã vé','',true);
 if(page==='media')return btn('upload','Thêm tệp','',true);
 return '';
}
function home(m){
 const summary=db.report(museum,Sota.day(-29),Sota.day());
 return `<section class="hero"><small>${esc(m.fields.city||'Bảo tàng')}</small><h2>${esc(m.name)}</h2><p>${esc(m.fields.address)}</p></section>
 <h2 class="section">Hoạt động bảo tàng</h2><div class="kpis">${stat('Số vé đã bán · 30 ngày',summary.qty)}${stat('Doanh thu vé · 30 ngày',money(summary.total))}${stat('Đơn chờ giao',db.queue(museum).filter(o=>o.kind==='shop'&&o.status==='confirmed').length)}</div><h2 class="section">Lối tắt nghiệp vụ</h2><div class="shortcuts">${['artifact','gate','order'].map(k=>btn('nav',pages[k]+' →',k)).join('')}</div>`;
}
function catalog(){
 const rows=db.list(museum,page);
 return `<h2 class="section">${titles[page]}</h2>${rows.map(x=>{
 const details=Object.entries(x.fields).filter(([k,v])=>v && k!=='description').map(([k,v])=>k==='price'?money(v):`${labels[k]} · ${v}`);
 if(page==='exhibit')details.push(`${x.links.length} hiện vật`);
 if(x.source)details.push(x.source.code);
 return `<article class="row"><div><h3>${esc(x.name)}</h3><p>${esc(details.join('　/　'))}</p>${x.fields.description?`<p>${esc(x.fields.description)}</p>`:''}</div>${badge(x.status)}${page!=='museum'?btn('edit','Chi tiết',x.id):''}</article>`;
 }).join('')||empty('Chưa có bản ghi cho bảo tàng này.')}${page==='ticket'?'<p class="muted">Vé bảo tàng dùng các khung giờ cố định.</p>':''}`;
}
function orders(){
 const ticket=page==='gate';
 const choices=ticket?['pending','confirmed','used','cancelled']:['pending','confirmed','shipped','completed','cancelled'];
 const rows=db.queue(museum).filter(o=>o.kind===(ticket?'ticket':'shop') && (!filter||o.status===filter) && (!ticket||!visit||o.visit===visit));
 return `<div class="tools"><label>Trạng thái<select id="status-filter">${opt('','Tất cả',filter)}${choices.map(k=>opt(k,statuses[k],filter)).join('')}</select></label>${ticket?`<label>Ngày tham quan<input type="date" id="visit-filter" value="${esc(visit)}"></label>`:''}</div>
 ${rows.map(o=>`<article class="row"><div><h3>${esc(o.code||o.id)}</h3><p>${ticket?esc(o.visit+' · '+o.slot):esc(o.label)} · ${esc(money(o.qty*o.price+o.fee))}</p></div>${badge(o.status)}${btn('detail','Chi tiết',o.id)}</article>`).join('')||empty('Không có đơn phù hợp.')}`;
}
function media(){
 const rows=db.media(museum);
 return `<p class="muted">Ảnh và video gắn với hiện vật hoặc sản phẩm của bảo tàng.</p>${rows.map(a=>`<article class="row"><div><h3>${esc(a.name)}</h3><p>${esc(db.items.find(x=>x.id===a.target)?.name)} · Thứ tự ${a.sequence}${a.primary?' · Tệp chính':''}</p></div>${btn('asset','Xem tệp',a.id)}</article>`).join('')||empty('Thư viện đang trống. Chọn Thêm tệp để thử với tệp trên máy.')}`;
}
function report(){
 const {from,to,exhibit}=reportDates;
 const r=db.report(museum,from,to,exhibit), daily=new Map();
 for(const o of r.rows){const v=daily.get(o.date)||[0,0];v[0]+=o.qty;v[1]+=o.qty*o.price;daily.set(o.date,v);}
 const max=Math.max(1,...[...daily.values()].map(v=>v[0]));
 return `<form class="tools" id="report"><label>Từ ngày<input type="date" name="from" value="${from}" required></label><label>Đến ngày<input type="date" name="to" value="${to}" required></label><label>Triển lãm<select name="exhibit">${opt('','Tất cả',exhibit)}${db.list(museum,'exhibit').map(x=>opt(x.id,x.name,exhibit)).join('')}</select></label><button class="primary">Áp dụng</button></form><p class="muted">Doanh thu vé mô phỏng theo ngày thanh toán, gồm giao dịch đã thu tiền.</p><div class="kpis section">${stat('Vé đã bán',r.qty)}${stat('Doanh thu vé',money(r.total))}</div>${daily.size?`<div class="panel tablewrap"><table><thead><tr><th>Ngày</th><th>Số vé</th><th>Doanh thu</th></tr></thead><tbody>${[...daily].sort().map(([d,v])=>`<tr><td>${esc(d)}</td><td>${v[0]}<div class="metricbar" style="width:${Math.round(100*v[0]/max)}%"></div></td><td>${esc(money(v[1]))}</td></tr>`).join('')}</tbody></table></div>`:empty('Chưa có giao dịch trong khoảng này.')}`;
}
function input(name,label,value='',type='text',attrs=''){return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
function modal(title,body,save,callback){
 $('#form-body').innerHTML=`<h2 id="dialog-title">${esc(title)}</h2>${body}`;
 $('#editor').setAttribute('aria-labelledby','dialog-title');$('#form-error').textContent='';
 $('#save').hidden=!save;$('#save').textContent=save||'Lưu';dialogSubmit=callback;
 if(!$('#editor').open)$('#editor').showModal();
}
function edit(id){
 const kind=page, item=id?db.list(museum,kind).find(x=>x.id===id):undefined;
 const choices=kind==='ticket'?['available','unavailable']:['draft','published','archived'];
 let body=input('name','Tên',item?.name,'text','required maxlength="160"')+fields[kind].map(k=>{
 const type=['start','end'].includes(k)?'date':['price','stock'].includes(k)?'number':'text';
 return k==='description'?`<label>Mô tả<textarea name="description">${esc(item?.fields[k])}</textarea></label>`:input(k,labels[k],item?.fields[k],type,type==='number'?'min="0" required step="'+(k==='stock'?'1':'0.01')+'"':['date'].includes(type)||k==='slug'?'required':'');
 }).join('')+`<label>Trạng thái<select name="status">${choices.map(s=>opt(s,statuses[s],item?.status)).join('')}</select></label>`;
 if(kind==='exhibit')body+=`<fieldset><legend>Hiện vật liên kết</legend>${db.list(museum,'artifact').filter(x=>x.status==='published'||item?.links.includes(x.id)).map(x=>`<label class="check"><input name="link" value="${esc(x.id)}" type="checkbox" ${item?.links.includes(x.id)?'checked':''}>${esc(x.name)}</label>`).join('')||'Chưa có hiện vật đã xuất bản.'}</fieldset>`;
 if(item?.source)body+=`<p>Nguồn mẫu Smithsonian · ${esc(item.source.code)} · ${esc(item.source.rights)}<br>${esc(item.source.url)}</p>`;
 modal((id?'Chỉnh sửa ':'Thêm ')+single[kind],body,'Lưu',f=>{const values=Object.fromEntries(fields[kind].map(k=>[k,String(f.get(k)||'').trim()]));const updated=db.save(museum,kind,id,f.get('name'),f.get('status'),values,f.getAll('link'));if(kind==='museum')museum=updated.id;return 'Đã lưu '+single[kind]+'.';});
}
function detail(id){
 const o=db.queue(museum).find(o=>o.id===id);
 if(!o)throw new Error('Không tìm thấy đơn.');
 const canCancel=o.status==='confirmed'&&(o.kind==='shop'||o.visit>Sota.day());
 const next=o.kind==='shop' && o.paid?({confirmed:'shipped',shipped:'completed'})[o.status]:'';
 modal(o.id,`<p>${badge(o.status)}</p><p>${esc(o.label)} × ${o.qty} · ${esc(money(o.price))}</p>${o.kind==='ticket'?`<p>Ngày tham quan · ${esc(o.visit+' '+o.slot)}</p>`:`<p>Phí giao hàng · ${esc(money(o.fee))}</p>`}<p>${o.paid?'Đã thanh toán mô phỏng':'Chưa thanh toán'} · ${esc(money(o.qty*o.price+o.fee))}</p>${o.paid?`<p>Hóa đơn chỉ đọc · ${esc(o.id)}</p>`:''}${o.usedAt?`<p>Đã soát · ${esc(new Date(o.usedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))}</p>`:''}<div class="actions">${next?btn('transition','Chuyển sang '+statuses[next],id+'|'+next,true):''}${canCancel?btn('transition','Hủy đơn',id+'|cancelled'):''}</div>`,'');
}
function asset(id){
 const a=db.media(museum).find(x=>x.id===id);if(!a)throw new Error('Không tìm thấy tệp.');
 const preview=a.mime.startsWith('image/')?`<img class="preview" src="${esc(a.url)}" alt="${esc(a.name)}">`:`<video class="preview" src="${esc(a.url)}" controls></video>`;
 modal(a.name,preview+input('sequence','Thứ tự',a.sequence,'number','min="0" step="1" required')+`<label class="check"><input type="checkbox" name="primary" ${a.primary?'checked':''}>Tệp chính</label>${btn('delasset','Xóa tệp',id)}`,'Lưu',f=>{db.updateMedia(museum,id,Number(f.get('sequence')),f.has('primary'));return 'Đã lưu tệp.';});
}
function act(action,id){
 if(action==='logout'){$('#editor').close();db.role='anon';museum='';page='home';render();return;}
 db.guard(museum);
 switch(action){
 case 'nav':page=id;resetFilters();render();$('#main').focus();break;
 case 'edit':case 'new':edit(id);break;
 case 'detail':detail(id);break;
 case 'asset':asset(id);break;
 case 'import':modal('Nhập mẫu Smithsonian','<p>Dữ liệu giả lập, dùng để kiểm tra mã nguồn trùng và quyền sử dụng.</p><label>Số hiện vật<select name="count"><option>2</option><option>1</option></select></label>','Nhập mẫu',f=>{const r=db.importSample(museum,Number(f.get('count')));return `Đã nhập ${r.added} · Bỏ qua ${r.skipped} · Lỗi 0`;});break;
 case 'redeem':modal('Soát vé vào cửa',input('code','Mã vào cửa','','text','required placeholder="SOTA-101"'),'Xác nhận vào cửa',f=>{db.redeem(museum,f.get('code'));return 'Đã ghi nhận vào cửa.';});break;
 case 'transition':{const [order,status]=id.split('|');modal('Xác nhận cập nhật',`<p>${esc(order)} → ${esc(statuses[status])}</p>`,'Xác nhận',()=>{db.advance(museum,order,status);return 'Đã cập nhật đơn.';});break;}
 case 'upload':{const targets=[...db.list(museum,'artifact'),...db.list(museum,'product')];if(!targets.length)throw new Error('Tạo một hiện vật hoặc sản phẩm trước khi thêm tệp.');
 modal('Thêm tệp mô phỏng',`<label>Đối tượng<select name="target">${targets.map(x=>opt(x.id,x.name)).join('')}</select></label><label>Ảnh hoặc video<input type="file" name="file" required accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"></label><p class="muted">Ảnh tối đa 10 MB, video tối đa 50 MB. Tệp chỉ được xem trong phiên này.</p>`,'Thêm tệp',f=>{db.upload(museum,f.get('target'),f.get('file'));return 'Đã thêm tệp.';});break;}
 case 'delasset':modal('Xóa tệp khỏi đối tượng?','<p>Thao tác này gỡ tệp khỏi thư viện mô phỏng.</p>','Xóa tệp',()=>{db.removeMedia(museum,id);return 'Đã xóa tệp.';});break;
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;try{act(b.dataset.action,b.dataset.id);}catch(error){notice(error.message);}});
$('#close').onclick=()=>$('#editor').close();
document.addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.target);
 try{
 switch(e.target.id){
 case 'form':{db.guard(museum);const msg=dialogSubmit(f);$('#editor').close();render();notice(msg);break;}
 case 'login':db.role=f.get('role');museum='';render();break;
 case 'choose':db.guard(f.get('museum'));museum=f.get('museum');page='home';resetFilters();render();break;
 case 'report':{const dates=Object.fromEntries(f);db.report(museum,dates.from,dates.to,dates.exhibit);reportDates=dates;render();break;}
 }
 }catch(error){if(e.target.id==='form')$('#form-error').textContent=error.message;else notice(error.message);}
});
document.addEventListener('change',e=>{
 if(e.target.id==='museum-switch'){museum=e.target.value;page='home';resetFilters();render();}
 if(e.target.id==='status-filter'){filter=e.target.value;render();}
 if(e.target.id==='visit-filter'){visit=e.target.value;render();}
});
window.addEventListener('focus',()=>{if(museum&&!db.museums().some(x=>x.id===museum)){if($('#editor').open)$('#editor').close();render();}});
render();
