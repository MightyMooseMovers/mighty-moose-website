/* Mighty Moose Movers: junk removal price tool.
   Same numbers and rules as the Google Sheet "Mighty Moose Moving - Junk Removal & Profit"
   (Settings, Trailers and Load sizes tabs). Change a number there, change it here too. */
(function () {
  var C = {
    gasPerLitre: 1.40,     // Settings: Gas price
    towFuel: 16.0,         // Settings: Tow vehicle fuel use while towing (L/100 km)
    fuelBuffer: 0.15,      // Settings: Extra fuel for stop-and-go driving
    perWorkerHour: 55,     // Settings: Charge per worker per hour
    minHours: 0.5,         // Settings: Minimum billed hours
    trailerName: "6x12 Utility",
    trailerDay: 34.95,     // Trailers tab: 6x12 Utility daily rate
    trailerFees: 5,        // Settings: U-Haul extra fees per trailer rental
    rentalTax: 0.13,       // Settings: Tax on trailer rental
    dumpRate: 75,          // Settings: Landfill rate per tonne
    dumpMin: 75,           // Settings: Landfill minimum per trip
    fridgeFee: 35,         // Settings: Fee per fridge, freezer, AC
    applianceKg: 70,       // Settings: Average weight of an appliance for scrap
    minPrice: 75,          // Settings: Minimum price for any job
    depositPct: 0.30,      // Settings: Deposit
    itemHours: 0.25        // Load sizes tab: extra time per fridge or appliance
  };
  // Load sizes tab: weight kg, work hours, crew, jobs per trip (in London)
  var LOADS = [
    { id: "small", sheet: "One small item", label: "One small item", sub: "A chair, small table or a few bags", short: "one small item", kg: 25, work: 0.25, crew: 1, share: 4, icon: "chair" },
    { id: "big", sheet: "One big item", label: "One big item", sub: "A couch, mattress, dresser or appliance", short: "one big item", kg: 60, work: 0.5, crew: 2, share: 3, icon: "couch" },
    { id: "q", sheet: "1/4 trailer", label: "\u00BC trailer", sub: "One room cleared, a corner of the garage", short: "\u00BC trailer", kg: 175, work: 0.75, crew: 2, share: 2, icon: 0.25 },
    { id: "half", sheet: "1/2 trailer", label: "\u00BD trailer", sub: "A basement corner or small apartment", short: "\u00BD trailer", kg: 350, work: 1.25, crew: 2, share: 1, icon: 0.5 },
    { id: "tq", sheet: "3/4 trailer", label: "\u00BE trailer", sub: "A garage clean-out", short: "\u00BE trailer", kg: 525, work: 1.75, crew: 2, share: 1, icon: 0.75 },
    { id: "full", sheet: "Full trailer", label: "Full trailer", sub: "A whole basement or estate clean-out", short: "full trailer", kg: 700, work: 2.25, crew: 2, share: 1, icon: 1 },
    { id: "more", label: "More than a trailer", sub: "We'll give you a custom price", short: "more than a trailer", custom: true, icon: "two" }
  ];
  var PLACES = [
    { id: "curb", label: "Curbside, driveway or garage", sub: "Easy to reach", short: "curbside", factor: 1.0 },
    { id: "inside", label: "Inside, ground floor", sub: "No stairs", short: "inside, ground floor", factor: 1.15 },
    { id: "stairs", label: "Upstairs or basement", sub: "Stairs to carry it down or up", short: "upstairs or basement", factor: 1.35 }
  ];
  var DISTS = [
    { id: "london", label: "In London", sub: "Anywhere in the city", short: "in London", km: 35, drive: 0.75 },
    { id: "town", label: "Nearby town", sub: "15 to 40 km, like St. Thomas or Strathroy", short: "nearby town", km: 80, drive: 1.5 },
    { id: "far", label: "Farther away", sub: "40 to 100 km", short: "40\u2013100 km away", km: 180, drive: 2.5 },
    { id: "xfar", label: "Over 100 km", sub: "We'll give you a custom price", short: "over 100 km", custom: true }
  ];
  var DEFAULTS = { load: "q", place: "curb", dist: "london", fridges: 0, appl: 0, reno: false };

  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function r6(x) { return Math.round(x * 1e6) / 1e6; }
  function ceilTo(x, f) { return Math.ceil(r6(x) / f) * f; }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-CA"); }
  function hoursText(h) {
    var w = Math.floor(h + 1e-9), f = h - w, frac = f > 0.7 ? "\u00BE" : f > 0.45 ? "\u00BD" : f > 0.2 ? "\u00BC" : "";
    return (w > 0 ? w : "") + frac + (h <= 1 ? " hour" : " hours");
  }
  function clean(s) {
    var o = {};
    for (var k in DEFAULTS) o[k] = (s && k in s) ? s[k] : DEFAULTS[k];
    if (!find(LOADS, o.load)) o.load = DEFAULTS.load;
    if (!find(PLACES, o.place)) o.place = DEFAULTS.place;
    if (!find(DISTS, o.dist)) o.dist = DEFAULTS.dist;
    o.fridges = Math.max(0, Math.min(9, parseInt(o.fridges, 10) || 0));
    o.appl = Math.max(0, Math.min(9, parseInt(o.appl, 10) || 0));
    o.reno = !!o.reno && o.reno !== "0";
    return o;
  }

  // The Jobs-tab formulas of the junk removal sheet, for one website answer
  function quote(state) {
    var s = clean(state), load = find(LOADS, s.load), place = find(PLACES, s.place), dist = find(DISTS, s.dist);
    var r = { state: s, load: load, place: place, dist: dist };
    if (load.custom || dist.custom || s.reno) {
      r.custom = true;
      r.reason = s.reno ? "reno" : load.custom ? "big" : "far";
      return r;
    }
    var share = dist.id === "london" ? load.share : 1;           // small jobs in town share a trailer and dump trip
    var est = ceilTo(load.work * place.factor + C.itemHours * (s.fridges + s.appl) + dist.drive / share, 0.25);
    var hours = Math.max(est, C.minHours);                        // Billed hours
    var trailer = (C.trailerDay + C.trailerFees) * (1 + C.rentalTax) / share;
    var km = dist.km / share;
    var gas = km * C.towFuel / 100 * (1 + C.fuelBuffer) * C.gasPerLitre;
    var kg = Math.max(load.kg - s.appl * C.applianceKg, 0);       // appliances go for scrap, not the landfill
    var dump = kg === 0 ? 0 : Math.max(kg / 1000 * C.dumpRate, C.dumpMin / share);
    var fridgeFees = s.fridges * C.fridgeFee;
    var price = Math.max(C.minPrice, ceilTo(trailer + gas + dump + fridgeFees + hours * load.crew * C.perWorkerHour, 10) - 1);
    var deposit = ceilTo(price * C.depositPct, 5);
    r.custom = false; r.share = share; r.hours = hours; r.km = km; r.crew = load.crew;
    r.price = price; r.deposit = deposit;
    return r;
  }

  function summary(r) {
    if (r.custom && r.reason === "reno") return "renovation waste";
    var bits = [r.load.short];
    if (!r.load.custom) bits.push(r.place.short);
    bits.push(r.dist.short);
    return bits.join(" \u00B7 ");
  }
  function extrasText(s) {
    var x = [];
    if (s.fridges) x.push(s.fridges + (s.fridges > 1 ? " fridges/freezers/ACs" : " fridge/freezer/AC"));
    if (s.appl) x.push(s.appl + " other appliance" + (s.appl > 1 ? "s" : ""));
    if (s.reno) x.push("renovation waste");
    return x;
  }
  // Lines for the booking email or text message
  function requestLines(r) {
    var s = r.state, lines = ["Service: Junk removal", "How much: " + r.load.label, "Where: " + r.place.label, "Area: " + r.dist.label];
    var x = extrasText(s);
    if (x.length) lines.push("Special items: " + x.join(", "));
    if (r.custom) lines.push("Website price: custom price needed");
    else {
      lines.push("Website price: " + money(r.price) + " (deposit " + money(r.deposit) + ")");
      lines.push("Quote details: " + r.load.sheet + ", " + C.trailerName + ", " + r6(r.km) + " km, " + r.hours + " hours, " + r.crew + " crew, " +
        r.share + " job" + (r.share > 1 ? "s" : "") + " per trip, " + s.fridges + " fridges, " + s.appl + " appliances");
    }
    return lines;
  }
  function encode(s) { s = clean(s); return [s.load, s.place, s.dist, s.fridges, s.appl, s.reno ? 1 : 0].join("."); }
  function decode(str) {
    var p = String(str || "").split(".");
    if (p.length < 6) return null;
    return clean({ load: p[0], place: p[1], dist: p[2], fridges: p[3], appl: p[4], reno: p[5] === "1" });
  }

  // ---------- Drawing ----------
  function icon(kind) {
    var g = '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round">';
    if (kind === "chair") return '<svg viewBox="0 0 46 40" aria-hidden="true">' + g + '<path d="M16 6v16h14V6"/><path d="M14 22h18v4H14z"/><path d="M16 26v9M30 26v9"/></g></svg>';
    if (kind === "couch") return '<svg viewBox="0 0 46 40" aria-hidden="true">' + g + '<path d="M9 20v-6a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v6"/><path d="M5 20a3 3 0 0 1 6 0v4h24v-4a3 3 0 0 1 6 0v9H5z"/><path d="M9 29v4M37 29v4"/></g></svg>';
    function trailer(x, w, fill) {
      var h = 12, y = 14, inner = '';
      if (fill > 0) { var fh = (h - 2) * fill; inner = '<rect x="' + (x + 1.5) + '" y="' + (y + h - 1 - fh) + '" width="' + (w - 3) + '" height="' + fh + '" fill="currentColor" stroke="none" opacity=".4"/>'; }
      return inner + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5"/><path d="M' + (x + w) + ' ' + (y + h - 3) + 'h5"/><circle cx="' + (x + w * 0.38) + '" cy="' + (y + h + 4) + '" r="3"/>';
    }
    if (kind === "two") return '<svg viewBox="0 0 46 40" aria-hidden="true">' + g + trailer(1, 16, 1) + trailer(23, 16, 1) + '</g></svg>';
    return '<svg viewBox="0 0 46 40" aria-hidden="true">' + g + trailer(4, 33, kind) + '</g></svg>';
  }
  var TICK = '<span class="tick" aria-hidden="true"><svg><use href="#i-check"/></svg></span>';
  function choices(p, name, list, type, withIcons) {
    return list.map(function (o) {
      var id = p + "-" + name + "-" + o.id;
      return '<div class="choice"><input type="' + type + '" name="' + p + "-" + name + '" id="' + id + '" value="' + o.id + '">' +
        '<label for="' + id + '">' + (withIcons ? '<span class="ico">' + icon(o.icon) + '</span>' : '') +
        '<span class="txt"><strong>' + o.label + '</strong><span>' + o.sub + '</span></span>' + TICK + '</label></div>';
    }).join("");
  }
  function stepper(p, key, title, sub) {
    return '<div class="stepper"><div class="txt"><strong>' + title + '</strong><span>' + sub + '</span></div><div class="count">' +
      '<button type="button" data-step="' + key + '" data-d="-1" id="' + p + '-' + key + '-minus" aria-label="One less: ' + title + '">\u2212</button>' +
      '<output id="' + p + '-' + key + '-count" aria-live="polite" class="num">0</output>' +
      '<button type="button" data-step="' + key + '" data-d="1" id="' + p + '-' + key + '-plus" aria-label="One more: ' + title + '">+</button></div></div>';
  }
  function q(n, title, hint, body, extraId) {
    return '<fieldset class="q"' + (extraId ? ' id="' + extraId + '"' : '') + '><legend><span class="q-num">' + n + '</span><span class="q-title">' + title + '</span></legend>' +
      '<p class="q-hint">' + hint + '</p>' + body + '</fieldset>';
  }

  function mount(o) {
    var p = o.prefix || "jk", form = o.questions, card = o.card, state = clean(o.state);
    function $(id) { return document.getElementById(p + "-" + id); }
    form.innerHTML =
      q(1, "How much junk?", "A full trailer is about two pickup-truck beds, piled to the top of the sides.", '<div class="choices">' + choices(p, "load", LOADS, "radio", true) + '</div>') +
      q(2, "Where is it?", "Pick the hardest spot if it's in a few places.", '<div class="choices list">' + choices(p, "place", PLACES, "radio", false) + '</div>') +
      q(3, "Where are you?", "Not sure? Pick \"In London\".", '<div class="choices">' + choices(p, "dist", DISTS, "radio", false) + '</div>') +
      q(4, "Anything special?", "Skip this if none apply.",
        stepper(p, "fridges", "Fridges, freezers or ACs", "These need special handling at the landfill. $35 each.") +
        stepper(p, "appl", "Other appliances", "Washer, dryer, stove or dishwasher. Each adds a few minutes.") +
        '<div class="choices list" style="margin-top:12px">' + choices(p, "reno", [{ id: "1", label: "Renovation waste", sub: "Drywall, lumber, flooring or tiles. These need a look first." }], "checkbox", false) + '</div>' +
        '<p class="note">We take almost everything. The only things we can\'t take are paint, propane tanks, chemicals and asbestos.</p>');
    card.innerHTML =
      '<div class="label-card"><div class="label-top"><span class="eyebrow">Your junk removal price</span>' +
      '<span class="arrows" aria-hidden="true"><svg><use href="#i-up"/></svg><svg><use href="#i-up"/></svg></span></div>' +
      '<div id="' + p + '-normal"><p class="price num" id="' + p + '-price" aria-live="polite"></p><p class="price-sub" id="' + p + '-summary"></p>' +
      '<div class="deposit"><span>Deposit to book (30%)</span><span class="num" id="' + p + '-deposit"></span><span class="dep-pay">Pay by e-transfer, card or cash</span></div>' +
      '<ul class="included" id="' + p + '-included"></ul>' +
      '<p class="fine">Minimum price $75. This is an estimate. Send us a few photos and we\'ll confirm one fixed price before you book.</p></div>' +
      '<div id="' + p + '-custom" hidden><p class="custom-msg">Let\'s talk about this one.</p><p class="fine" id="' + p + '-why"></p></div>' +
      '<div class="send"><h3 id="' + p + '-cta-h">Like this price?</h3>' +
      '<a class="btn btn-red" id="' + p + '-book" href="#book"><svg aria-hidden="true"><use href="#i-box"/></svg><span id="' + p + '-book-label">Book this price</span></a>' +
      '<a class="btn btn-forest" href="tel:+12266370481"><svg aria-hidden="true"><use href="#i-phone"/></svg>Call us</a>' +
      '<p class="phone-line">Text or call<span class="big num">(226) 637-0481</span></p></div></div>';

    function li(t) { return '<li><svg aria-hidden="true"><use href="#i-check"/></svg><span>' + t + '</span></li>'; }
    function render() {
      $("load-" + state.load).checked = true;
      $("place-" + state.place).checked = true;
      $("dist-" + state.dist).checked = true;
      $("reno-1").checked = state.reno;
      ["fridges", "appl"].forEach(function (k) {
        $(k + "-count").textContent = state[k];
        $(k + "-minus").disabled = state[k] <= 0;
        $(k + "-plus").disabled = state[k] >= 9;
      });
      var r = quote(state);
      $("normal").hidden = r.custom; $("custom").hidden = !r.custom;
      if (r.custom) {
        $("why").textContent = r.reason === "reno" ? "Renovation waste goes to a different drop-off, so we'd like to see it first. Send photos and we'll price it."
          : r.reason === "big" ? "Big clean-outs get a custom price. Send us photos or call, and we'll work it out with you."
          : "Jobs over 100 km away get a custom price. Call or text us.";
        $("cta-h").textContent = "Tell us about it"; $("book-label").textContent = "Ask for a custom price";
      } else {
        $("price").textContent = money(r.price);
        $("summary").textContent = summary(r);
        $("deposit").textContent = money(r.deposit);
        var lines = [(r.crew === 1 ? "1 person" : r.crew + " people") + " for about " + hoursText(r.hours),
          "Trailer, gas and the dump fees", "Good furniture donated, metal recycled"];
        if (state.fridges) lines.push(state.fridges + (state.fridges > 1 ? " fridges, freezers or ACs" : " fridge, freezer or AC"));
        if (state.appl) lines.push(state.appl + " other appliance" + (state.appl > 1 ? "s" : ""));
        $("included").innerHTML = lines.map(li).join("");
        $("cta-h").textContent = "Like this price?"; $("book-label").textContent = "Book this price";
      }
      if (o.bookHref) $("book").href = o.bookHref(state);
      try { localStorage.setItem("mm-junk", encode(state)); } catch (e) {}
      if (o.onChange) o.onChange(r);
      return r;
    }
    form.addEventListener("change", function (e) {
      var t = e.target, n = t.name || "";
      if (n === p + "-load") state.load = t.value;
      if (n === p + "-place") state.place = t.value;
      if (n === p + "-dist") state.dist = t.value;
      if (n === p + "-reno") state.reno = t.checked;
      render();
    });
    form.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-step]"); if (!b) return;
      var k = b.getAttribute("data-step");
      state[k] = Math.max(0, Math.min(9, state[k] + (+b.getAttribute("data-d"))));
      render();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    var api = {
      quote: function () { return quote(state); },
      set: function (s) { state = clean(s); return render(); },
      state: function () { return clean(state); }
    };
    render();
    return api;
  }

  function saved() { try { return decode(localStorage.getItem("mm-junk")); } catch (e) { return null; } }

  window.MMJunk = { config: C, LOADS: LOADS, PLACES: PLACES, DISTS: DISTS, DEFAULTS: DEFAULTS, quote: quote, summary: summary,
    requestLines: requestLines, encode: encode, decode: decode, saved: saved, mount: mount, money: money };
})();
