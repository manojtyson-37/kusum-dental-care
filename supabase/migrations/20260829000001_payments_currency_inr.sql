-- Dr. Kusum's Dental Care is a Bangalore clinic — payments default to INR, not USD.
alter table public.payments alter column currency set default 'INR';
