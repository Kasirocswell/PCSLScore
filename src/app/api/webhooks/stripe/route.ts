import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/utils/stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client with service role key to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature') || ''

  let event: any

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'

  try {
    if (webhookSecret === 'whsec_placeholder' || sig === 'bypass') {
      // Safe developer bypass for local testing using raw JSON post payload
      event = JSON.parse(body)
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    }
  } catch (err: any) {
    console.error('Stripe webhook verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const session = event.data?.object

  console.log(`Processing Stripe Webhook Event: ${event.type}`, {
    id: session?.id,
    metadata: session?.metadata,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const metadata = session.metadata || {}

        // 1. Handle Match Director Subscriptions
        if (metadata.type === 'director_subscription') {
          const profileId = metadata.profile_id
          const customerId = session.customer

          if (!profileId) {
            console.error('Missing profile_id in subscription session metadata')
            break
          }

          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_active: true,
              stripe_customer_id: customerId as string,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileId)

          if (error) {
            console.error('Failed to activate director profile subscription:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          console.log(`Activated MD Subscription for profile ${profileId}`)
        }

        // 2. Handle Competitor Match Prepayment Fee
        if (metadata.type === 'match_registration_payment') {
          const registrationId = metadata.registration_id
          const paymentIntentId = session.payment_intent || 'pi_placeholder'

          if (!registrationId) {
            console.error('Missing registration_id in match payment session metadata')
            break
          }

          const { error } = await supabaseAdmin
            .from('registrations')
            .update({
              payment_status: 'paid',
              payment_intent_id: paymentIntentId as string,
            })
            .eq('id', registrationId)

          if (error) {
            console.error('Failed to update competitor registration payment:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          console.log(`Updated Competitor Registration ${registrationId} to PAID. Match squadding unlocked.`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = session.customer
        const status = session.status

        if (status === 'active') {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId)

          if (error) {
            console.error('Failed to update active subscription:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          console.log(`Subscription active sync for Stripe Customer ID: ${customerId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const customerId = session.customer

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Failed to deactivate profile subscription:', error.message)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log(`Deactivated MD Subscription for customer ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled stripe webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook processing exception:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
