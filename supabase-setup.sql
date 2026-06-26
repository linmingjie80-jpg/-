-- ════════════════════════════════════════════════════════════
--  富贵花开 · 开单系统 Supabase 建库脚本
--  用法：Supabase 后台 → 左侧 SQL Editor → New query →
--        把本文件全部粘贴进去 → 点 Run。只需运行一次。
-- ════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 员工表（每人独立账号 + PIN）─────────────────────────────
create table if not exists public.workers (
  id         bigint generated always as identity primary key,
  name       text unique not null,         -- 登录名（工人名字）
  pin_hash   text not null,                -- PIN 加密哈希，绝不存明文
  is_boss    boolean not null default false, -- 老板可看全部订单+统计
  active     boolean not null default true,  -- 离职可设 false 停用
  created_at timestamptz default now()
);

-- ── 订单表 ──────────────────────────────────────────────────
create table if not exists public.orders (
  id               bigint generated always as identity primary key,
  created_at       timestamptz default now(),
  worker_name      text not null,          -- 哪个工人开的单
  customer_name    text,
  customer_phone   text,
  customer_address text,
  items            jsonb not null,         -- [{name, price, qty, subtotal}]
  subtotal         numeric(10,2) not null default 0,
  discount         numeric(10,2) not null default 0,
  shipping         numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  note             text,
  status           text not null default 'pending'  -- pending/paid/shipped
);

-- ── 锁死两张表：禁止任何直连访问，只能走下面的 RPC 函数 ──────
alter table public.workers enable row level security;
alter table public.orders  enable row level security;

-- ── 新增/修改员工（老板在 SQL Editor 里调用，不开放给前端）──
create or replace function public.set_worker(p_name text, p_pin text, p_is_boss boolean default false)
returns void language sql security definer set search_path = public as $$
  insert into workers(name, pin_hash, is_boss)
  values (p_name, crypt(p_pin, gen_salt('bf')), p_is_boss)
  on conflict (name) do update
    set pin_hash = crypt(p_pin, gen_salt('bf')),
        is_boss  = excluded.is_boss,
        active   = true;
$$;

-- ── 登录校验：PIN 对则返回员工信息 ──────────────────────────
create or replace function public.worker_login(p_name text, p_pin text)
returns table(id bigint, name text, is_boss boolean)
language sql security definer set search_path = public as $$
  select id, name, is_boss from workers
  where name = p_name and active and pin_hash = crypt(p_pin, pin_hash);
$$;

-- ── 创建订单（每次重新校验 PIN，防止伪造）───────────────────
create or replace function public.create_order(
  p_name text, p_pin text,
  p_customer_name text, p_customer_phone text, p_customer_address text,
  p_items jsonb, p_subtotal numeric, p_discount numeric,
  p_shipping numeric, p_total numeric, p_note text
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not exists (select 1 from workers where name = p_name and active and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception '账号或 PIN 错误';
  end if;
  insert into orders(worker_name, customer_name, customer_phone, customer_address,
                     items, subtotal, discount, shipping, total, note)
  values (p_name, p_customer_name, p_customer_phone, p_customer_address,
          p_items, p_subtotal, p_discount, p_shipping, p_total, p_note)
  returning id into v_id;
  return v_id;
end; $$;

-- ── 老板查看全部订单（仅 is_boss 可调用）────────────────────
create or replace function public.list_orders(p_name text, p_pin text, p_limit int default 300)
returns setof orders language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from workers where name = p_name and active and is_boss and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception '无权限';
  end if;
  return query select * from orders order by created_at desc limit p_limit;
end; $$;

-- ── 老板改订单状态（pending → paid → shipped）───────────────
create or replace function public.update_order_status(p_name text, p_pin text, p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from workers where name = p_name and active and is_boss and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception '无权限';
  end if;
  update orders set status = p_status where id = p_id;
end; $$;

-- ── 只把「登录/开单/看单/改状态」开放给前端，set_worker 不开放 ──
grant execute on function public.worker_login(text, text)                                              to anon;
grant execute on function public.create_order(text, text, text, text, text, jsonb, numeric, numeric, numeric, numeric, text) to anon;
grant execute on function public.list_orders(text, text, int)                                          to anon;
grant execute on function public.update_order_status(text, text, bigint, text)                         to anon;

-- ════════════════════════════════════════════════════════════
--  最后：创建账号（把 PIN 改成你自己的！）
--  老板账号（能看全部订单）：
select set_worker('阿迪',  '8888', true);
--  工人账号（只能开单），按需多加几行：
select set_worker('工人A', '1111', false);
select set_worker('工人B', '2222', false);
-- ════════════════════════════════════════════════════════════
