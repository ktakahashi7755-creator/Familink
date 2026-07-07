// Familink 決済：Stripe Billing Portal セッション作成（お支払い・解約の管理）
// 呼び出し: sb.functions.invoke('billing-portal', { body:{ returnUrl } })
// 認証: JWT からユーザーを特定 → その顧客の管理ページURLを返す。
// 必要な環境変数: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// デプロイ: supabase functions deploy billing-portal
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const SB_URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const asUser = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error } = await asUser.auth.getUser()
    if (error || !user) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } })
    const { data: ent } = await admin.from('fl_entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    const customerId = ent?.stripe_customer_id as string | undefined
    if (!customerId) return json({ error: 'no_customer' }, 400)

    const body = await req.json().catch(() => ({}))
    const returnUrl: string = body.returnUrl || (SB_URL + '/')
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
    return json({ url: portal.url })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } })
}
