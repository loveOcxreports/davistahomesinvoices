// Davista Homes Invoice — shared business logic.
// Ported verbatim from the design prototype's <script data-dc-script> block.
// Pure functions only — no DOM, no storage — so this file is directly reusable
// by the React Native mobile app.

const DEFAULT_ADDR = 'Apt 4 – 1 S D Dan-Iya Close, Guzape, Abuja';

const DEFAULT_TERMS = [
  'Check-in is 2pm and Check-out is 12noon',
  'All properties and features of the apartment should be kept in the appropriate manner before leaving.',
  'A security deposit of N100,000.00 will be made (refundable if nothing is damaged)',
  'Light consumption is very expensive so we plead with guests to always switch appliances not in use.',
  'No Smoking in the Apartment – If you need to smoke, please make use of the balcony because smoking in the apartment attracts a fees of N50,000.00 (covers for deep cleaning)',
  'Parties are not allowed in the apartment or any form of loud noise that can disturb the neighborhood.',
  'Any damaged property or feature caused by the guest will be replaced by the guest or paid for.',
  'The payment for the apartment does not cover activities as guest is expected to pay separately for activities and games'
].join('\n');

const DEFAULT_PAYMENT = 'PAYMENT; Account No: 6503859987 | Bank: Providus Bank | Name: Ehichioya Osagie David';
const DEFAULT_SIGN_NAME = 'Emmanuel Offei';
const DEFAULT_SIGN_ROLE = 'Manager (08109233737) | blacklinksgh@gmail.com';
const DEFAULT_LINE = { desc: 'Payment for 3 Bedroom Apartment', unit: 1, nights: 1, price: 200000 };
const FIRST_INVOICE_NO = 34749;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function under1000(n) {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' and '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
  else if (n > 0) s += ONES[n];
  return s;
}

function words(num) {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Naira';
  const groups = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
  let rest = n, out = [];
  for (const [v, label] of groups) {
    if (rest >= v) { out.push(under1000(Math.floor(rest / v)) + ' ' + label); rest %= v; }
  }
  if (rest) out.push(under1000(rest));
  let s = out.join(' ') + ' Naira';
  const kobo = Math.round((Math.abs(num) - n) * 100);
  if (kobo) s += ', ' + under1000(kobo) + ' Kobo';
  return s;
}

function ord(d) {
  if (d % 100 >= 11 && d % 100 <= 13) return d + 'th';
  return d + ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][d % 10];
}

function longDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return ord(d) + ' ' + MONTHS[m - 1] + ' ' + y;
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const ms = new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
  return ms > 0 ? Math.round(ms / 86400000) : 0;
}

function money(n) {
  return 'N' + (Number(n) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad10(n) { return String(n).padStart(10, '0'); }

function nextInvoiceNo(saved) {
  const nums = (saved || []).map(s => parseInt(s.invoiceNo, 10)).filter(n => !isNaN(n));
  return (nums.length ? Math.max.apply(null, nums) : FIRST_INVOICE_NO) + 1;
}

function lineTotal(l) {
  return (Number(l.unit) || 0) * (Number(l.nights) || 0) * (Number(l.price) || 0);
}

function grandTotal(f) {
  return (f.lines || []).reduce((sum, l) => sum + lineTotal(l), 0);
}

function durationLabel(l) {
  const n = Number(l.nights) || 0;
  return n + (n === 1 ? ' Night' : ' Nights');
}

function stayLine(f) {
  if (!f.checkIn && !f.checkOut) return '';
  return 'CheckIn: ' + f.inTime + ' – ' + longDate(f.checkIn) + ' – ' + longDate(f.checkOut) + ' (CheckOut: On or Before ' + f.outTime + ')';
}

function termsList(f) {
  return String(f.terms || '').split('\n').filter(t => t.trim()).map(t => t.trim());
}

function blankInvoice(invoiceNo, opts) {
  opts = opts || {};
  return {
    id: 'inv_' + Date.now(),
    invoiceNo: invoiceNo,
    companyAddr: opts.companyAddr || DEFAULT_ADDR,
    clientName: '', clientPhone: '', clientEmail: '',
    checkIn: '', checkOut: '', inTime: '2pm', outTime: '12noon',
    lines: [Object.assign({}, DEFAULT_LINE)],
    terms: opts.terms || DEFAULT_TERMS,
    payment: DEFAULT_PAYMENT,
    signName: DEFAULT_SIGN_NAME,
    signRole: DEFAULT_SIGN_ROLE,
    total: 0,
    savedAt: null
  };
}

const DavistaLib = {
  DEFAULT_ADDR, DEFAULT_TERMS, DEFAULT_PAYMENT, DEFAULT_SIGN_NAME, DEFAULT_SIGN_ROLE,
  DEFAULT_LINE, FIRST_INVOICE_NO,
  words, longDate, nightsBetween, money, pad10, nextInvoiceNo,
  lineTotal, grandTotal, durationLabel, stayLine, termsList, blankInvoice
};

if (typeof module !== 'undefined' && module.exports) module.exports = DavistaLib;
