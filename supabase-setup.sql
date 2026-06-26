-- ════════════════════════════════════════════════════════════
--  富贵花开 · 开单（发票）系统 — Supabase 一键建库脚本
--  用法：Supabase 后台 → SQL Editor → New query → 全部粘贴 → Run。
--  可重复运行（幂等）；运行后最底部会列出账号用于核对。
-- ════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── 员工（每人独立 PIN）──────────────────────────────────────
create table if not exists public.workers (
  id bigint generated always as identity primary key,
  name text unique not null,
  pin_hash text not null,
  is_boss boolean not null default false,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ── 发票 ────────────────────────────────────────────────────
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  worker_name text not null,
  number text,
  inv_date text,
  sales_person text,
  customer_name text, customer_phone text, customer_address text,
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  paid numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  note text,
  status text not null default 'unpaid'
);
-- 兼容旧表：补齐新列
alter table public.orders add column if not exists number text;
alter table public.orders add column if not exists inv_date text;
alter table public.orders add column if not exists sales_person text;
alter table public.orders add column if not exists paid numeric(10,2) not null default 0;

-- ── 客户库 ──────────────────────────────────────────────────
create table if not exists public.customers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  address text,
  created_at timestamptz default now()
);

alter table public.workers   enable row level security;
alter table public.orders    enable row level security;
alter table public.customers enable row level security;

-- ── 内部校验函数 ────────────────────────────────────────────
create or replace function public.chk(p_name text, p_pin text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists(select 1 from workers where name=p_name and active and pin_hash=crypt(p_pin,pin_hash));
$$;

create or replace function public.set_worker(p_name text, p_pin text, p_is_boss boolean default false)
returns void language sql security definer set search_path = public, extensions as $$
  insert into workers(name, pin_hash, is_boss)
  values (p_name, crypt(p_pin, gen_salt('bf')), p_is_boss)
  on conflict (name) do update
    set pin_hash = crypt(p_pin, gen_salt('bf')), is_boss = excluded.is_boss, active = true;
$$;

create or replace function public.worker_login(p_name text, p_pin text)
returns table(id bigint, name text, is_boss boolean)
language sql security definer set search_path = public, extensions as $$
  select id, name, is_boss from workers
  where name = p_name and active and pin_hash = crypt(p_pin, pin_hash);
$$;

-- ── 下一个发票号 INV-年份-序号 ──────────────────────────────
create or replace function public.next_invoice_number(p_name text, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare n int; y text := to_char(now(),'YYYY');
begin
  if not chk(p_name, p_pin) then raise exception '账号或 PIN 错误'; end if;
  select count(*)+1 into n from orders where number like 'INV-'||y||'-%';
  return 'INV-'||y||'-'||lpad(n::text, 4, '0');
end; $$;

-- ── 保存发票（p_id 为 null 则新建，否则更新）────────────────
create or replace function public.save_invoice(
  p_name text, p_pin text, p_id bigint,
  p_number text, p_inv_date text, p_sales text,
  p_cust_name text, p_cust_phone text, p_cust_address text,
  p_items jsonb, p_subtotal numeric, p_discount numeric, p_paid numeric, p_total numeric,
  p_note text, p_status text
) returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint;
begin
  if not chk(p_name, p_pin) then raise exception '账号或 PIN 错误'; end if;
  if p_id is null then
    insert into orders(worker_name, number, inv_date, sales_person, customer_name, customer_phone,
                       customer_address, items, subtotal, discount, paid, total, note, status)
    values (p_name, p_number, p_inv_date, p_sales, p_cust_name, p_cust_phone,
            p_cust_address, p_items, p_subtotal, p_discount, p_paid, p_total, p_note, p_status)
    returning id into v_id;
  else
    update orders set number=p_number, inv_date=p_inv_date, sales_person=p_sales,
      customer_name=p_cust_name, customer_phone=p_cust_phone, customer_address=p_cust_address,
      items=p_items, subtotal=p_subtotal, discount=p_discount, paid=p_paid, total=p_total,
      note=p_note, status=p_status
    where id=p_id returning id into v_id;
  end if;
  return v_id;
end; $$;

-- ── 列出发票：老板看全部，工人看自己开的 ───────────────────
create or replace function public.list_invoices(p_name text, p_pin text, p_limit int default 300)
returns setof orders language plpgsql security definer set search_path = public, extensions as $$
declare v_boss boolean;
begin
  select is_boss into v_boss from workers where name=p_name and active and pin_hash=crypt(p_pin,pin_hash);
  if v_boss is null then raise exception '账号或 PIN 错误'; end if;
  if v_boss then
    return query select * from orders order by created_at desc limit p_limit;
  else
    return query select * from orders where worker_name=p_name order by created_at desc limit p_limit;
  end if;
end; $$;

-- ── 删除发票（老板，或本人开的）────────────────────────────
create or replace function public.delete_invoice(p_name text, p_pin text, p_id bigint)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_boss boolean;
begin
  select is_boss into v_boss from workers where name=p_name and active and pin_hash=crypt(p_pin,pin_hash);
  if v_boss is null then raise exception '账号或 PIN 错误'; end if;
  delete from orders where id=p_id and (v_boss or worker_name=p_name);
end; $$;

-- ── 客户库 ──────────────────────────────────────────────────
create or replace function public.list_customers(p_name text, p_pin text)
returns setof customers language plpgsql security definer set search_path = public, extensions as $$
begin
  if not chk(p_name, p_pin) then raise exception '账号或 PIN 错误'; end if;
  return query select * from customers order by name;
end; $$;

create or replace function public.save_customer(p_name text, p_pin text, p_id bigint, p_cname text, p_phone text, p_address text)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint;
begin
  if not chk(p_name, p_pin) then raise exception '账号或 PIN 错误'; end if;
  if p_id is null then
    insert into customers(name, phone, address) values (p_cname, p_phone, p_address) returning id into v_id;
  else
    update customers set name=p_cname, phone=p_phone, address=p_address where id=p_id returning id into v_id;
  end if;
  return v_id;
end; $$;

create or replace function public.delete_customer(p_name text, p_pin text, p_id bigint)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not chk(p_name, p_pin) then raise exception '账号或 PIN 错误'; end if;
  delete from customers where id=p_id;
end; $$;

-- ── 员工管理（仅老板，供后台 admin 员工管理页用）──────────
create or replace function public.admin_list_workers(p_name text, p_pin text)
returns table(id bigint, name text, is_boss boolean, active boolean)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists(select 1 from workers where name=p_name and active and is_boss and pin_hash=crypt(p_pin,pin_hash)) then
    raise exception '无权限'; end if;
  return query select w.id, w.name, w.is_boss, w.active from workers w order by w.id;
end; $$;

create or replace function public.admin_save_worker(p_name text, p_pin text, p_target text, p_new_pin text, p_is_boss boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists(select 1 from workers where name=p_name and active and is_boss and pin_hash=crypt(p_pin,pin_hash)) then
    raise exception '无权限'; end if;
  if p_target = p_name then p_is_boss := true; end if;   -- 不能取消自己的老板身份
  if exists(select 1 from workers where name=p_target) then
    update workers set is_boss=p_is_boss, active=true,
      pin_hash = case when coalesce(p_new_pin,'')<>'' then crypt(p_new_pin, gen_salt('bf')) else pin_hash end
    where name=p_target;
  else
    if coalesce(p_new_pin,'')='' then raise exception '新员工必须设 PIN'; end if;
    insert into workers(name, pin_hash, is_boss) values (p_target, crypt(p_new_pin, gen_salt('bf')), p_is_boss);
  end if;
end; $$;

create or replace function public.admin_set_active(p_name text, p_pin text, p_target text, p_active boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists(select 1 from workers where name=p_name and active and is_boss and pin_hash=crypt(p_pin,pin_hash)) then
    raise exception '无权限'; end if;
  if p_target = p_name and not p_active then raise exception '不能停用自己'; end if;
  update workers set active=p_active where name=p_target;
end; $$;

-- ── 开放给前端的函数（chk / set_worker 不开放）─────────────
grant execute on function public.admin_list_workers(text,text)                             to anon;
grant execute on function public.admin_save_worker(text,text,text,text,boolean)            to anon;
grant execute on function public.admin_set_active(text,text,text,boolean)                  to anon;
grant execute on function public.worker_login(text,text)                                   to anon;
grant execute on function public.next_invoice_number(text,text)                            to anon;
grant execute on function public.save_invoice(text,text,bigint,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,text) to anon;
grant execute on function public.list_invoices(text,text,int)                              to anon;
grant execute on function public.delete_invoice(text,text,bigint)                          to anon;
grant execute on function public.list_customers(text,text)                                 to anon;
grant execute on function public.save_customer(text,text,bigint,text,text,text)            to anon;
grant execute on function public.delete_customer(text,text,bigint)                         to anon;

-- ════════════════════════════════════════════════════════════
--  账号（把 PIN 改成你要的；同名再跑一次 = 改 PIN）
-- ════════════════════════════════════════════════════════════
select set_worker('阿迪',  '8888', true);   -- 老板（看全部发票）
select set_worker('工人A', '1111', false);  -- 工人
select set_worker('工人B', '2222', false);  -- 工人

-- ── 核对：运行后下面会列出所有账号 ─────────────────────────
select name as 名字, is_boss as 是老板, active as 启用,
       (pin_hash like '$2%') as 密码已加密
from workers order by id;
