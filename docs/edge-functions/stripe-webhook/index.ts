// Familink 決済：Stripe Webhook（権利の正本を書き込む・Supabase / Deno）
// Stripe → このエンドポイントに送られるイベントを検証し、fl_entitlements を更新。
// これが「課金状態はサーバ権利を正本」の要。クライアントは一切書けない（service_role のみ）。
//
// 必要な環境変数: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// デプロイ: supabase functions deploy stripe-webhook --no-verify-jwt
//   （Stripe からの呼び出しは JWT を持たないため --no-verify-jwt。代わりに署名検証で真正性を担保）
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const WH_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

async function upsertFromSubscription(userId: string | null, customerId: string, sub: Stripe.Subscription) {
  const active = sub.status === 'active' || sub.status === 'trialing'
  const row: Record<string, unknown> = {
    premium: active,
    status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }
  if (userId) {
    row.user_id = userId
    await admin.from('fl_entitlements').upsert(row, { onConflict: 'user_id' })
  } else {
    // user_id 不明時は customer 一致で更新
    await admin.from('fl_entitlements').update(row).eq('stripe_customer_id', customerId)
  }
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, WH_SECRET)
  } catch (e) {
    return new Response('bad signature: ' + (e as Error).message, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = (s.client_reference_id as string) || (s.metadata?.user_id as string) || null
        const customerId = s.customer as string
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string)
          await upsertFromSubscription(userId, customerId, sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = (sub.metadata?.user_id as string) || null
        await upsertFromSubscription(userId, sub.customer as string, sub)
        break
      }
      default:
        break
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
})
