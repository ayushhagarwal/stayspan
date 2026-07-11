// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { collectPageSnapshot } from './collector'
import { extractStay } from './engine'

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
})
