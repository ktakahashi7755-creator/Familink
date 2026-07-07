// Familink 決済：Stripe Checkout セッション作成（Supabase / Deno）
// 呼び出し: アプリが sb.functions.invoke('create-checkout', { body:{ returnUrl } })
// 認証: 呼び出し元ユーザーの JWT（Authorization ヘッダ）から user を特定。
// 返り値: { url } … Stripe のホスト型決済ページ（カード情報はアプリを通らない）
// 秘密鍵はここ（Edge Function シークレット）にのみ。クライアントには置かない。
//
// 必要な環境変数: STRIPE_SECRET_KEY, STRIPE_PRICE_ID(月額480円のprice), SUPABASE_URL,
//                 SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// デプロイ: supabase functions deploy create-checkout
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!
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
    // 呼び出しユーザーを特定
    const asUser = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uerr } = await asUser.auth.getUser()
    if (uerr || !user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const returnUrl: string = body.returnUrl || (SB_URL + '/')

    const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } })

    // 既存の Stripe 顧客IDを取得（無ければ作成して保存）
    const { data: ent } = await admin.from('fl_entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    let customerId = ent?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } })
      customerId = customer.id
      await admin.from('fl_entitlements').upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'checkout=success',
      cancel_url: returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'checkout=cancel',
      allow_promotion_codes: true,
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } })
}
