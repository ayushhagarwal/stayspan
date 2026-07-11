// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { collectPageSnapshot } from './collector'
import { extractStay, parseDateValue } from './engine'

function render(html: string, title = 'Booking details') {
  document.head.innerHTML = `<title>${title}</title>`
  document.body.innerHTML = html
}

describe('generic semantic extraction', () => {
  beforeEach(() => render(''))

  it('prefers lodging structured data when available', () => {
    render(`
      <script type="application/ld+json">{
        "@type":"Hotel","name":"Harbour House","telephone":"+61 2 5550 0100",
        "address":{"streetAddress":"12 Bay Road","addressLocality":"Sydney","addressCountry":"Australia"}
      }</script>
      <main><h1>Booking details</h1><p>Check-in: 20 January 2027 at 3:00 PM</p><p>Check-out: 23 January 2027 at 11:00 AM</p></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.propertyName).toBe('Harbour House')
    expect(result.draft.address).toContain('12 Bay Road')
    expect(result.draft.phone).toBe('+61 2 5550 0100')
    expect(result.fields.propertyName?.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('rejects a misleading heading and finds a property heading in booking context', () => {
    render(`
      <header><h1>★</h1></header>
      <main><section><h1>Harbour House</h1><div>Check-in</div><div>20 January 2027</div><div>Check-out</div><div>23 January 2027</div><div>Address</div><p>12 Bay Road, Sydney, Australia</p></section></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.propertyName).toBe('Harbour House')
    expect(result.draft.address).toContain('12 Bay Road')
  })

  it('finds a linked property name beside booking details without relying on a heading', () => {
    render(`
      <header><a href="/hotels">Hotels & Homes</a><h1>Your booking is confirmed</h1></header>
      <main><article>
        <a href="/trust-and-safety">Learn more about staying safe online</a>
        <a href="/hotel/jp/harbour-house">Harbour House Riverside</a>
        <section><h2>Check-in</h2><p>20 January 2027 at 3:00 PM</p></section>
        <section><h2>Check-out</h2><p>23 January 2027 at 11:00 AM</p></section>
        <p>Address</p><p>12 Bay Road, Sydney, Australia</p>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.propertyName).toBe('Harbour House Riverside')
    expect(result.fields.propertyName?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('prefers a linked stay name over booking section headings', () => {
    render(`
      <header><h1>Your booking is confirmed</h1></header>
      <main>
        <a href="/property/city/lantern-hostel"><h2>Lantern Hostel Central</h2></a>
        <section><h2>Room information</h2><h3>Benefits</h3></section>
        <div><span>Check-in</span><span>9 October 2027</span><span>4:00 PM</span></div>
        <div><span>Check-out</span><span>13 October 2027</span><span>11:00 AM</span></div>
        <div><span>Address</span><span>5 Lantern Street, Central District, Tokyo, Japan</span></div>
      </main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.propertyName).toBe('Lantern Hostel Central')
    expect(result.draft.propertyName).not.toBe('Room information')
  })

  it('extracts split check-in and check-out date-time values', () => {
    render(`
      <main><article><h2>Mountain Lodge</h2>
        <div><span>Check-in</span><span>8 October 2027</span><span>15:00</span></div>
        <div><span>Check-out</span><span>11 October 2027</span><span>11:00</span></div>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.checkIn).toBe('2027-10-08T15:00')
    expect(result.draft.checkOut).toBe('2027-10-11T11:00')
  })

  it('extracts cancellation policy and deadline', () => {
    render(`
      <main><article><h2>Mountain Lodge</h2>
        <p>Check-in: 8 October 2027 at 3:00 PM</p><p>Check-out: 11 October 2027 at 11:00 AM</p>
        <section><strong>Cancellation policy</strong><p>Free cancellation until 5 October 2027 at 6:00 PM. After this time the first night is charged.</p></section>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.cancellationPolicy.toLowerCase()).toContain('free cancellation')
    expect(result.draft.cancellationDeadline).toBe('2027-10-05T18:00')
  })

  it('extracts an explicit deadline from a separate refund schedule', () => {
    render(`
      <main><article><h2>Lantern House</h2>
        <p>Check-in: 15 October 2026 at 3:00 PM</p><p>Check-out: 17 October 2026 at 11:00 AM</p>
        <table><tr><th>Cancellation policy</th><td>You may cancel free of charge until 2 days before arrival. If you cancel later, the fee is 50% of the total price.</td></tr></table>
        <section><h3>Refund schedule</h3><p>You'll get a full refund if you cancel before 23:59 on 12 October 2026. If you cancel from 13 October 2026, you'll receive a partial refund.</p></section>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.cancellationDeadline).toBe('2026-10-12T23:59')
    expect(result.fields.cancellationDeadline?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('does not treat a booking ID as a phone number', () => {
    render(`
      <main><article><h2>City Hotel</h2><p>Booking ID 1234567890</p>
        <p>Check-in: 8 October 2027 at 3:00 PM</p><p>Check-out: 11 October 2027 at 11:00 AM</p>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.phone).toBe('')
  })

  it('accepts a labelled contact number and flags date-only values', () => {
    render(`
      <main><article><h2>City Hotel</h2>
        <p>Check-in: 8 October 2027</p><p>Check-out: 11 October 2027</p>
        <div><span>Property contact</span><span>+44 20 7946 0958</span></div>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.phone).toBe('+44 20 7946 0958')
    expect(result.fields.checkIn?.needsReview).toBe(true)
  })

  it('flags an unlabelled postal-looking address for review', () => {
    render(`
      <main><article><h2>City Hotel</h2>
        <p>Check-in: 8 October 2027 at 3:00 PM</p><p>Check-out: 11 October 2027 at 11:00 AM</p>
        <p>12 Bay Road, Central District, Sydney, Australia</p>
      </article></main>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.address).toContain('12 Bay Road')
    expect(result.fields.address?.needsReview).toBe(true)
  })

  it('returns none when no essential booking fields are recoverable', () => {
    render('<main><h1>Welcome</h1><p>Explore places around the world.</p></main>', 'Travel home')
    const result = extractStay(collectPageSnapshot())
    expect(result.status).toBe('none')
  })

  it('prefers a detailed policy over short badges and recovers explicit 24-hour times', () => {
    expect(parseDateValue('12 March 2027 15:00 - 23:00', 15)?.value).toBe('2027-03-12T15:00')
    render(`
      <header><h1>Your booking is confirmed</h1></header>
      <main><article>
        <h1>Seaside Inn</h1>
        <section>
          <h3>Check-in</h3><div>12 March 2027</div><div>15:00 - 23:00</div>
          <h3>Check-out</h3><div>15 March 2027</div><div>from 12:00</div>
        </section>
        <table><tr><th>Cancellation policy</th><td>Cancel for free until 18:00 on 10 March 2027. After this time, the first night is charged.</td></tr></table>
        <div>Free cancellation</div>
        <p>12 Ocean Road, Harbour District, Brighton, United Kingdom</p>
        <a href="tel:+44 20 7946 0958">Contact the property at +44 20 7946 0958</a>
      </article></main>
      <aside><a href="/another-stay">Another property with free cancellation until 20 March 2027</a></aside>
    `)
    const result = extractStay(collectPageSnapshot())
    expect(result.draft.propertyName).toBe('Seaside Inn')
    expect(result.draft.checkIn).toBe('2027-03-12T15:00')
    expect(result.draft.checkOut).toBe('2027-03-15T12:00')
    expect(result.draft.cancellationDeadline).toBe('2027-03-10T18:00')
    expect(result.draft.cancellationPolicy).toContain('first night is charged')
  })

  it('strips sensitive query parameters and fragments from the source URL', () => {
    window.history.replaceState({}, '', '/confirmation?auth_key=secret#details')
    render('<main><h1>Seaside Inn</h1><p>Check-in: 12 March 2027</p></main>')
    const snapshot = collectPageSnapshot()
    expect(snapshot.url).toBe(`${window.location.origin}/confirmation`)
    expect(snapshot.url).not.toContain('secret')
  })
})
