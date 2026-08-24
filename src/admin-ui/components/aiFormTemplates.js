function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

const CONTEXT_TEMPLATES = {
  explorevalley: {
    title: "ExploreValley",
    object: {
      title: "",
      slug: "",
      description: "",
      content: "",
      active: true
    }
  },
  tours: {
    title: "Tours",
    object: {
      id: "",
      title: "",
      location: "",
      description: "",
      duration: "",
      price: 0,
      hero_image: "",
      available: true,
      price_dropped: false,
      price_drop_percent: 0
    }
  },
  hotels: {
    title: "Hotels",
    object: {
      id: "",
      name: "",
      location: "",
      description: "",
      price_per_night: 0,
      check_in_time: "13:00",
      check_out_time: "11:00",
      min_nights: 30,
      max_nights: 60,
      child_policy: "asdf",
      hero_image: "",
      seasonal_pricing: [
        { label: "Off Season", start: "", end: "", price: 0, enabled: true },
        { label: "Peak Season", start: "", end: "", price: 0, enabled: true }
      ],
      date_overrides: {},
      available: true,
      price_dropped: false,
      price_drop_percent: 0
    }
  },
  cottages: {
    title: "Cottages",
    object: {
      id: "",
      name: "",
      location: "",
      description: "",
      price_per_night: 0,
      images: [],
      amenities: [],
      room_types: [
        { type: "Standard Room", price: 0, capacity: 2 }
      ],
      rating: 0,
      reviews: 0,
      check_in_time: "14:00",
      check_out_time: "11:00",
      availability: {
        closedDates: [],
        roomsByType: {}
      },
      min_nights: 30,
      max_nights: 60,
      child_policy: "asdf",
      hero_image: "",
      seasonal_pricing: [],
      date_overrides: {},
      available: true,
      created_at: "",
      price_dropped: false,
      price_drop_percent: 0,
      image_titles: [],
      image_descriptions: [],
      image_meta: [],
      vendor_mobile: "",
      additional_comments: "",
      category: "cottage",
      private_spaces: [],
      shared_spaces: [],
      room_amenities: [],
      popular_with_guests: [],
      room_features: [],
      basic_facilities: [],
      beds_and_blanket: [],
      food_and_drinks: [],
      safety_and_security: [],
      media_and_entertainment: [],
      bathroom: [],
      other_facilities: [],
      inclusion: [],
      exclusion: []
    }
  },
  food_vendors: {
    title: "Food Vendor",
    object: {
      id: "",
      name: "",
      location: "",
      description: "",
      cuisine: [],
      hero_image: "",
      available: true
    }
  },
  food_menu_item: {
    title: "Food Menu Item",
    object: {
      id: "",
      restaurant_id: "",
      category: "General",
      name: "",
      description: "",
      price: 0,
      image: "",
      available: true,
      is_veg: false
    }
  },
  marts: {
    title: "Mart",
    object: {
      id: "",
      name: "",
      location: "",
      phone: "",
      category: "",
      description: "",
      available: true
    }
  },
  mart_products: {
    title: "Mart Product",
    object: {
      id: "",
      mart_id: "",
      category_id: "",
      name: "",
      description: "",
      quantity: "",
      price: 0,
      mrp: 0,
      image: "",
      available: true
    }
  },
  cab_providers: {
    title: "Cab Provider / Route",
    object: {
      id: "",
      origin: "",
      destination: "",
      routeLabel: "",
      ordinary4_1: 0,
      luxury4_1: 0,
      ordinary6_1: 0,
      luxury6_1: 0,
      traveller: 0
    }
  },
  bike_rentals: {
    title: "Bike Rental",
    object: {
      id: "",
      name: "",
      location: "",
      bikeType: "",
      pricePerDay: 0,
      availableQty: 0,
      securityDeposit: 0,
      helmetIncluded: true,
      image: "",
      active: true
    }
  },
  buses: {
    title: "Bus",
    object: {
      id: "",
      operator: "",
      route: "",
      departure: "",
      arrival: "",
      fare: 0,
      seats: 0,
      available: true
    }
  }
};

function filterToColumns(obj, columns) {
  if (!Array.isArray(columns) || !columns.length) return obj;
  const allowed = new Set(columns.map((x) => (typeof x === "string" ? x : String(x?.name || ""))).filter(Boolean));
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    if (allowed.has(k)) out[k] = obj[k];
  });
  return out;
}

export function getAiTemplate(contextKey, columns = []) {
  const key = String(contextKey || "").toLowerCase();
  const picked = CONTEXT_TEMPLATES[key] || CONTEXT_TEMPLATES.explorevalley;
  const base = clone(picked.object);
  const filtered = filterToColumns(base, columns);
  return {
    contextKey: key,
    title: picked.title,
    template: filtered
  };
}
