var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// vendor/shared/src/schemas.ts
var import_zod, TaxRuleSlabSchema, PricingTierSchema, ImageMetaSchema, CabProviderSchema, CabRateSchema, CabPricingSchema, ServiceAreaSchema, CouponSchema, PoliciesSchema, PaymentsSchema, SitePageSchema, SitePagesSchema, SettingsSchema, TourSchema, FestivalSchema, HotelRoomTypeSchema, HotelSchema, RestaurantSchema, TaxBreakupSchema, BookingSchema, CabBookingSchema, DriverRegistrationRequestSchema, DriverSchema, DriverVehicleSchema, DriverDocumentSchema, DriverAvailabilitySchema, DriverBidSchema, RideAssignmentSchema, BusSeatSchema, BusRouteSchema, BusBookingSchema, BikeRentalSchema, BikeBookingSchema, MenuItemSchema, CartLineItemSchema, CartSchema, FoodOrderItemSchema, FoodOrderSchema, QuerySchema, AuditLogSchema, UserOrderRefSchema, AnalyticsEventSchema, PushNotificationSchema, UserProfileSchema, DeliveryPincodeSchema, UserAddressSchema, UserBehaviorProfileSchema, DatabaseSchema;
var init_schemas = __esm({
  "vendor/shared/src/schemas.ts"() {
    import_zod = require("zod");
    TaxRuleSlabSchema = import_zod.z.object({
      min: import_zod.z.number().nonnegative(),
      max: import_zod.z.number().nullable(),
      gst: import_zod.z.number().min(0).max(1)
    });
    PricingTierSchema = import_zod.z.object({
      name: import_zod.z.string().min(1),
      multiplier: import_zod.z.number().positive()
    });
    ImageMetaSchema = import_zod.z.object({
      url: import_zod.z.string(),
      title: import_zod.z.string().default(""),
      description: import_zod.z.string().default("")
    });
    CabProviderSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      vehicleType: import_zod.z.string().min(1),
      plateNumber: import_zod.z.string().min(4),
      capacity: import_zod.z.number().int().positive(),
      vendorMobile: import_zod.z.string().default(""),
      additionalComments: import_zod.z.string().default(""),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      active: import_zod.z.boolean().default(true),
      serviceAreaId: import_zod.z.string().optional()
    });
    CabRateSchema = import_zod.z.object({
      id: import_zod.z.string().optional(),
      origin: import_zod.z.string().default(""),
      destination: import_zod.z.string().default(""),
      routeLabel: import_zod.z.string().default(""),
      ordinary4_1: import_zod.z.number().nonnegative().optional(),
      luxury4_1: import_zod.z.number().nonnegative().optional(),
      ordinary6_1: import_zod.z.number().nonnegative().optional(),
      luxury6_1: import_zod.z.number().nonnegative().optional(),
      traveller: import_zod.z.number().nonnegative().optional()
    });
    CabPricingSchema = import_zod.z.object({
      baseFare: import_zod.z.number().nonnegative(),
      perKm: import_zod.z.number().nonnegative(),
      perMin: import_zod.z.number().nonnegative(),
      surgeRules: import_zod.z.array(import_zod.z.object({
        from: import_zod.z.string(),
        to: import_zod.z.string(),
        multiplier: import_zod.z.number().positive()
      })).default([]),
      nightCharges: import_zod.z.object({
        start: import_zod.z.string(),
        end: import_zod.z.string(),
        multiplier: import_zod.z.number().positive()
      }),
      tolls: import_zod.z.object({
        enabled: import_zod.z.boolean().default(false),
        defaultFee: import_zod.z.number().nonnegative().default(0)
      })
    });
    ServiceAreaSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      city: import_zod.z.string().min(2),
      enabled: import_zod.z.boolean().default(true)
    });
    CouponSchema = import_zod.z.object({
      code: import_zod.z.string().min(3),
      type: import_zod.z.enum(["flat", "percent"]),
      amount: import_zod.z.number().nonnegative(),
      minCart: import_zod.z.number().nonnegative().default(0),
      category: import_zod.z.enum(["hotel", "tour", "cab", "food", "all"]).default("all"),
      expiry: import_zod.z.string(),
      maxUses: import_zod.z.number().int().positive().optional()
    });
    PoliciesSchema = import_zod.z.object({
      hotel: import_zod.z.object({
        freeCancelHours: import_zod.z.number().int().nonnegative(),
        feeAfter: import_zod.z.number().min(0).max(1)
      }),
      tour: import_zod.z.object({
        freeCancelHours: import_zod.z.number().int().nonnegative(),
        feeAfter: import_zod.z.number().min(0).max(1)
      }),
      cab: import_zod.z.object({
        freeCancelMinutes: import_zod.z.number().int().nonnegative(),
        feeAfter: import_zod.z.number().nonnegative()
      }),
      food: import_zod.z.object({
        allowCancelMinutes: import_zod.z.number().int().nonnegative(),
        feeAfter: import_zod.z.number().nonnegative()
      })
    });
    PaymentsSchema = import_zod.z.object({
      walletEnabled: import_zod.z.boolean().default(false),
      refundMethod: import_zod.z.enum(["original", "wallet"]).default("original"),
      refundWindowHours: import_zod.z.number().int().nonnegative().default(72)
    });
    SitePageSchema = import_zod.z.object({
      title: import_zod.z.string().min(1),
      slug: import_zod.z.string().min(1),
      content: import_zod.z.string().default(""),
      updatedAt: import_zod.z.string().optional()
    });
    SitePagesSchema = import_zod.z.object({
      affiliateProgram: SitePageSchema.default({ title: "Affiliate Program", slug: "affiliate-program", content: "" }),
      contactUs: SitePageSchema.default({ title: "Contact Us", slug: "contact-us", content: "" }),
      privacyPolicy: SitePageSchema.default({ title: "Privacy Policy", slug: "privacy-policy", content: "" }),
      refundPolicy: SitePageSchema.default({ title: "Refund Policy", slug: "refund-policy", content: "" }),
      termsAndConditions: SitePageSchema.default({ title: "Terms and Conditions", slug: "terms-and-conditions", content: "" })
    });
    SettingsSchema = import_zod.z.object({
      currency: import_zod.z.literal("INR").default("INR"),
      // Controls which slug the frontend/admin should treat as the canonical URL for each CMS page.
      // This keeps slugs stable even if you rename a page, and lets you change routes without code changes.
      pageSlugs: import_zod.z.object({
        affiliateProgram: import_zod.z.string().min(1).default("affiliate-program"),
        contactUs: import_zod.z.string().min(1).default("contact-us"),
        privacyPolicy: import_zod.z.string().min(1).default("privacy-policy"),
        refundPolicy: import_zod.z.string().min(1).default("refund-policy"),
        termsAndConditions: import_zod.z.string().min(1).default("terms-and-conditions")
      }).default({
        affiliateProgram: "affiliate-program",
        contactUs: "contact-us",
        privacyPolicy: "privacy-policy",
        refundPolicy: "refund-policy",
        termsAndConditions: "terms-and-conditions"
      }),
      taxRules: import_zod.z.object({
        hotel: import_zod.z.object({
          slabs: import_zod.z.array(TaxRuleSlabSchema).min(1)
        }),
        tour: import_zod.z.object({ gst: import_zod.z.number().min(0).max(1), mode: import_zod.z.enum(["NO_ITC", "WITH_ITC"]).default("NO_ITC") }),
        food: import_zod.z.object({ gst: import_zod.z.number().min(0).max(1), mode: import_zod.z.string().default("DEFAULT") }),
        cab: import_zod.z.object({ gst: import_zod.z.number().min(0).max(1), mode: import_zod.z.string().default("DEFAULT") })
      }),
      pricingTiers: import_zod.z.array(PricingTierSchema).default([
        { name: "Economic", multiplier: 0.85 },
        { name: "Premium", multiplier: 1.15 },
        { name: "Luxury", multiplier: 1.4 }
      ])
    });
    TourSchema = import_zod.z.object({
      id: import_zod.z.string(),
      title: import_zod.z.string().min(2),
      description: import_zod.z.string().min(10),
      price: import_zod.z.number().nonnegative(),
      vendorMobile: import_zod.z.string().default(""),
      additionalComments: import_zod.z.string().default(""),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      duration: import_zod.z.string().min(1),
      images: import_zod.z.array(import_zod.z.string()).default([]),
      imageTitles: import_zod.z.array(import_zod.z.string()).default([]),
      imageDescriptions: import_zod.z.array(import_zod.z.string()).default([]),
      imageMeta: import_zod.z.array(ImageMetaSchema).default([]),
      highlights: import_zod.z.array(import_zod.z.string()).default([]),
      itinerary: import_zod.z.string().default(""),
      // WP-Travel-like richer content (all optional/backward compatible).
      mapEmbedUrl: import_zod.z.string().default(""),
      faqs: import_zod.z.array(import_zod.z.object({
        question: import_zod.z.string().min(1),
        answer: import_zod.z.string().default("")
      })).default([]),
      itineraryItems: import_zod.z.array(import_zod.z.object({
        day: import_zod.z.union([import_zod.z.number().int().positive(), import_zod.z.string()]).optional(),
        title: import_zod.z.string().default(""),
        content: import_zod.z.string().default("")
      })).default([]),
      facts: import_zod.z.array(import_zod.z.object({
        label: import_zod.z.string().min(1),
        value: import_zod.z.string().default("")
      })).default([]),
      // Flexible blocks for future growth (e.g. tabbed content, includes/excludes html, etc).
      contentBlocks: import_zod.z.record(import_zod.z.any()).default({}),
      // Translation-ready storage (locale => overrides).
      i18n: import_zod.z.record(import_zod.z.any()).default({}),
      inclusions: import_zod.z.array(import_zod.z.string()).default([]),
      exclusions: import_zod.z.array(import_zod.z.string()).default([]),
      maxGuests: import_zod.z.number().int().positive(),
      availability: import_zod.z.object({
        closedDates: import_zod.z.array(import_zod.z.string()).default([]),
        capacityByDate: import_zod.z.record(import_zod.z.number().int().positive()).default({})
      }).default({ closedDates: [], capacityByDate: {} }),
      available: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string(),
      updatedAt: import_zod.z.string().optional()
    });
    FestivalSchema = import_zod.z.object({
      id: import_zod.z.string(),
      title: import_zod.z.string().min(2),
      description: import_zod.z.string().min(5).default(""),
      location: import_zod.z.string().min(2).default(""),
      vendorMobile: import_zod.z.string().default(""),
      additionalComments: import_zod.z.string().default(""),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      month: import_zod.z.string().min(2).default("All Season"),
      date: import_zod.z.string().optional(),
      vibe: import_zod.z.string().default(""),
      ticket: import_zod.z.union([import_zod.z.string(), import_zod.z.number()]).default("On request"),
      images: import_zod.z.array(import_zod.z.string()).default([]),
      imageTitles: import_zod.z.array(import_zod.z.string()).default([]),
      imageDescriptions: import_zod.z.array(import_zod.z.string()).default([]),
      imageMeta: import_zod.z.array(ImageMetaSchema).default([]),
      highlights: import_zod.z.array(import_zod.z.string()).default([]),
      available: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string().optional(),
      updatedAt: import_zod.z.string().optional()
    });
    HotelRoomTypeSchema = import_zod.z.object({
      type: import_zod.z.string(),
      price: import_zod.z.number().nonnegative(),
      capacity: import_zod.z.number().int().positive()
    });
    HotelSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      description: import_zod.z.string().min(10),
      location: import_zod.z.string().min(2),
      offer: import_zod.z.string().default(""),
      vendorMobile: import_zod.z.string().default(""),
      additionalComments: import_zod.z.string().default(""),
      pricePerNight: import_zod.z.number().nonnegative(),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      images: import_zod.z.array(import_zod.z.string()).default([]),
      imageTitles: import_zod.z.array(import_zod.z.string()).default([]),
      imageDescriptions: import_zod.z.array(import_zod.z.string()).default([]),
      imageMeta: import_zod.z.array(ImageMetaSchema).default([]),
      amenities: import_zod.z.array(import_zod.z.string()).default([]),
      privateSpaces: import_zod.z.array(import_zod.z.string()).default([]),
      sharedSpaces: import_zod.z.union([import_zod.z.array(import_zod.z.string()), import_zod.z.record(import_zod.z.any())]).default([]),
      roomAmenities: import_zod.z.array(import_zod.z.string()).default([]),
      popularWithGuests: import_zod.z.array(import_zod.z.string()).default([]),
      roomFeatures: import_zod.z.array(import_zod.z.string()).default([]),
      basicFacilities: import_zod.z.array(import_zod.z.string()).default([]),
      bedsAndBlanket: import_zod.z.array(import_zod.z.string()).default([]),
      foodAndDrinks: import_zod.z.array(import_zod.z.string()).default([]),
      safetyAndSecurity: import_zod.z.array(import_zod.z.string()).default([]),
      mediaAndEntertainment: import_zod.z.array(import_zod.z.string()).default([]),
      bathroom: import_zod.z.array(import_zod.z.string()).default([]),
      otherFacilities: import_zod.z.array(import_zod.z.string()).default([]),
      inclusion: import_zod.z.union([import_zod.z.array(import_zod.z.string()), import_zod.z.record(import_zod.z.any())]).default([]),
      exclusion: import_zod.z.union([import_zod.z.array(import_zod.z.string()), import_zod.z.record(import_zod.z.any())]).default([]),
      roomTypes: import_zod.z.array(HotelRoomTypeSchema).min(1),
      rating: import_zod.z.number().min(0).max(5).default(0),
      reviews: import_zod.z.number().int().nonnegative().default(0),
      checkInTime: import_zod.z.string().default("14:00"),
      checkOutTime: import_zod.z.string().default("11:00"),
      availability: import_zod.z.object({
        closedDates: import_zod.z.array(import_zod.z.string()).default([]),
        roomsByType: import_zod.z.record(import_zod.z.number().int().nonnegative()).default({})
      }).default({ closedDates: [], roomsByType: {} }),
      seasonalPricing: import_zod.z.array(import_zod.z.object({
        from: import_zod.z.string(),
        to: import_zod.z.string(),
        multiplier: import_zod.z.number().positive()
      })).default([]),
      dateOverrides: import_zod.z.record(import_zod.z.object({
        priceMultiplier: import_zod.z.number().positive().optional(),
        priceOverride: import_zod.z.number().nonnegative().optional()
      })).default({}),
      minNights: import_zod.z.number().int().positive().default(1),
      maxNights: import_zod.z.number().int().positive().default(30),
      childPolicy: import_zod.z.string().default("Children allowed with extra bedding charges if required."),
      available: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string()
    });
    RestaurantSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      description: import_zod.z.string(),
      offer: import_zod.z.string().default(""),
      gstin: import_zod.z.string().default(""),
      username: import_zod.z.string().default(""),
      passwordHash: import_zod.z.string().default(""),
      vendorMobile: import_zod.z.string().default(""),
      additionalComments: import_zod.z.string().default(""),
      cuisine: import_zod.z.array(import_zod.z.string()),
      rating: import_zod.z.number().min(0).max(5),
      reviewCount: import_zod.z.number().int().nonnegative(),
      deliveryTime: import_zod.z.string(),
      minimumOrder: import_zod.z.number().nonnegative(),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      images: import_zod.z.array(import_zod.z.string()),
      imageTitles: import_zod.z.array(import_zod.z.string()).default([]),
      imageDescriptions: import_zod.z.array(import_zod.z.string()).default([]),
      imageMeta: import_zod.z.array(ImageMetaSchema).default([]),
      available: import_zod.z.boolean().default(true),
      isVeg: import_zod.z.boolean().default(false),
      tags: import_zod.z.array(import_zod.z.string()).default([]),
      location: import_zod.z.string(),
      serviceRadiusKm: import_zod.z.number().nonnegative().default(0),
      deliveryZones: import_zod.z.array(import_zod.z.string()).default([]),
      openHours: import_zod.z.string().default("09:00"),
      closingHours: import_zod.z.string().default("22:00"),
      menu: import_zod.z.array(import_zod.z.object({
        id: import_zod.z.string().optional(),
        name: import_zod.z.string().min(1),
        category: import_zod.z.string().default("General"),
        description: import_zod.z.string().default(""),
        image: import_zod.z.string().default(""),
        price: import_zod.z.number().nonnegative().default(0),
        rating: import_zod.z.number().min(0).max(5).default(0),
        maxOrders: import_zod.z.number().int().positive().default(10),
        addons: import_zod.z.array(import_zod.z.object({
          name: import_zod.z.string(),
          price: import_zod.z.number().nonnegative().default(0),
          comment: import_zod.z.string().optional()
        })).default([])
      })).default([])
    });
    TaxBreakupSchema = import_zod.z.object({
      gstRate: import_zod.z.number().min(0).max(1),
      taxableValue: import_zod.z.number().nonnegative(),
      gstAmount: import_zod.z.number().nonnegative(),
      cgst: import_zod.z.number().nonnegative(),
      sgst: import_zod.z.number().nonnegative(),
      igst: import_zod.z.number().nonnegative()
    });
    BookingSchema = import_zod.z.object({
      id: import_zod.z.string(),
      type: import_zod.z.enum(["hotel", "tour"]),
      itemId: import_zod.z.string(),
      userName: import_zod.z.string().min(2),
      email: import_zod.z.string().email(),
      phone: import_zod.z.string().min(8),
      // Legacy records may not have Aadhaar storage URLs populated.
      aadhaarUrl: import_zod.z.string().default(""),
      // WP-Travel-like booking metadata (optional/backward compatible).
      countryCode: import_zod.z.string().default(""),
      paidAmount: import_zod.z.number().nonnegative().optional(),
      // The charge this booking was paid by. Without it a payment that reached
      // Razorpay could only be matched to a booking by hand, from amount and time.
      razorpayPaymentId: import_zod.z.string().default(""),
      razorpayOrderId: import_zod.z.string().default(""),
      guests: import_zod.z.number().int().positive(),
      checkIn: import_zod.z.string().optional(),
      checkOut: import_zod.z.string().optional(),
      roomType: import_zod.z.string().optional(),
      numRooms: import_zod.z.number().int().positive().default(1),
      tourDate: import_zod.z.string().optional(),
      specialRequests: import_zod.z.string().default(""),
      pricing: import_zod.z.object({
        baseAmount: import_zod.z.number().nonnegative(),
        tax: TaxBreakupSchema,
        totalAmount: import_zod.z.number().nonnegative()
      }),
      status: import_zod.z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
      bookingDate: import_zod.z.string()
    });
    CabBookingSchema = import_zod.z.object({
      id: import_zod.z.string(),
      userName: import_zod.z.string().min(2),
      email: import_zod.z.string().default(""),
      phone: import_zod.z.string().min(8),
      pickupLocation: import_zod.z.string().min(2),
      dropLocation: import_zod.z.string().min(2),
      datetime: import_zod.z.string(),
      passengers: import_zod.z.number().int().positive(),
      vehicleType: import_zod.z.string().min(1),
      estimatedFare: import_zod.z.number().nonnegative(),
      // "union" rides are priced from a rate card and paid up front. "quotes" rides
      // — a typed pickup point or "use my current location" — have no rate card, so
      // they wait on a price from the travel desk or a driver bid.
      bookingMode: import_zod.z.enum(["union", "quotes"]).default("union"),
      quotedFare: import_zod.z.number().nonnegative().default(0),
      quotedAt: import_zod.z.string().default(""),
      quotedBy: import_zod.z.string().default(""),
      // Separate from `status`, which is the ride lifecycle the assignment, payment
      // and refund paths all branch on. See server/sql/add_cab_quote_fields.sql.
      // "cancelled" closes an open quote when the ride itself is cancelled. This is
      // a strict enum, so an unlisted value fails the whole database parse rather
      // than being stripped - which would have made cancelling a quoted ride throw.
      quoteStatus: import_zod.z.enum(["", "quoted", "accepted", "declined", "cancelled"]).default(""),
      serviceAreaId: import_zod.z.string().optional(),
      selectedBidId: import_zod.z.string().default(""),
      assignedDriverId: import_zod.z.string().default(""),
      paymentStatus: import_zod.z.string().default(""),
      paymentRequired: import_zod.z.boolean().default(false),
      paymentDueAmount: import_zod.z.number().nonnegative().default(0),
      paymentBidId: import_zod.z.string().default(""),
      paymentOrderId: import_zod.z.string().default(""),
      paymentOrderAmount: import_zod.z.number().nonnegative().default(0),
      paymentCurrency: import_zod.z.string().default(""),
      paymentPaidAt: import_zod.z.string().default(""),
      paymentId: import_zod.z.string().default(""),
      paymentSignature: import_zod.z.string().default(""),
      rideOtp: import_zod.z.string().default(""),
      rideOtpStatus: import_zod.z.enum(["not_required", "pending", "verified"]).default("not_required"),
      rideOtpIssuedAt: import_zod.z.string().default(""),
      rideOtpVerifiedAt: import_zod.z.string().default(""),
      rideOtpVerifiedBy: import_zod.z.string().default(""),
      pickupUpdatedAt: import_zod.z.string().default(""),
      pickupUpdatedBy: import_zod.z.string().default(""),
      updatedAt: import_zod.z.string().default(""),
      fineAmount: import_zod.z.number().nonnegative().default(0),
      fineStatus: import_zod.z.enum(["none", "due", "paid", "waived", "deducted"]).default("none"),
      fineReason: import_zod.z.string().default(""),
      noShowReportedBy: import_zod.z.string().default(""),
      noShowReportedAt: import_zod.z.string().default(""),
      pricing: import_zod.z.object({
        baseAmount: import_zod.z.number().nonnegative(),
        tax: TaxBreakupSchema,
        totalAmount: import_zod.z.number().nonnegative(),
        /**
         * Distance-based estimate for a quote ride, which is NOT its fare — the
         * totals above stay at 0 until the desk quotes or a driver bids. Carried
         * only so the travel desk has a starting figure in the quote box.
         *
         * It has to be declared here or it does not exist: Zod strips unknown keys,
         * and every mutateData revalidates the whole database, so an undeclared key
         * silently vanishes on the next write anywhere in the system.
         */
        suggestedFare: import_zod.z.number().nonnegative().default(0)
      }),
      status: import_zod.z.enum(["pending", "searching", "open", "confirmed", "completed", "cancelled"]).default("pending"),
      createdAt: import_zod.z.string()
    });
    DriverRegistrationRequestSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      phone: import_zod.z.string().min(8),
      email: import_zod.z.string().email().or(import_zod.z.string().length(0)).default(""),
      vehicleType: import_zod.z.string().min(1),
      vehicleNumber: import_zod.z.string().min(1),
      licenseNumber: import_zod.z.string().min(1),
      idProofUrl: import_zod.z.string().default(""),
      notes: import_zod.z.string().default(""),
      status: import_zod.z.enum(["pending", "approved", "rejected"]).default("pending"),
      reviewedBy: import_zod.z.string().default(""),
      reviewedAt: import_zod.z.string().default(""),
      rejectionReason: import_zod.z.string().default(""),
      createdAt: import_zod.z.string()
    });
    DriverSchema = import_zod.z.object({
      id: import_zod.z.string(),
      registrationRequestId: import_zod.z.string().default(""),
      name: import_zod.z.string().min(2),
      username: import_zod.z.string().default(""),
      phone: import_zod.z.string().min(8),
      email: import_zod.z.string().email().or(import_zod.z.string().length(0)).default(""),
      passwordHash: import_zod.z.string().default(""),
      status: import_zod.z.enum(["pending", "approved", "rejected", "disabled"]).default("pending"),
      rating: import_zod.z.number().min(0).max(5).default(4.5),
      active: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string(),
      updatedAt: import_zod.z.string()
    });
    DriverVehicleSchema = import_zod.z.object({
      id: import_zod.z.string(),
      driverId: import_zod.z.string(),
      vehicleType: import_zod.z.string().min(1),
      vehicleNumber: import_zod.z.string().min(1),
      color: import_zod.z.string().default(""),
      model: import_zod.z.string().default(""),
      seats: import_zod.z.number().int().positive().default(4),
      createdAt: import_zod.z.string()
    });
    DriverDocumentSchema = import_zod.z.object({
      id: import_zod.z.string(),
      driverId: import_zod.z.string().default(""),
      registrationRequestId: import_zod.z.string().default(""),
      kind: import_zod.z.enum(["id_proof", "license", "vehicle_photo", "vehicle_document", "other"]).default("other"),
      url: import_zod.z.string().min(1),
      label: import_zod.z.string().default(""),
      createdAt: import_zod.z.string()
    });
    DriverAvailabilitySchema = import_zod.z.object({
      id: import_zod.z.string(),
      driverId: import_zod.z.string(),
      online: import_zod.z.boolean().default(false),
      lat: import_zod.z.number().optional(),
      lng: import_zod.z.number().optional(),
      updatedAt: import_zod.z.string()
    });
    DriverBidSchema = import_zod.z.object({
      id: import_zod.z.string(),
      rideRequestId: import_zod.z.string(),
      driverId: import_zod.z.string(),
      bidPrice: import_zod.z.number().nonnegative(),
      etaMin: import_zod.z.number().int().positive(),
      status: import_zod.z.enum(["active", "withdrawn", "accepted", "rejected"]).default("active"),
      createdAt: import_zod.z.string(),
      updatedAt: import_zod.z.string()
    });
    RideAssignmentSchema = import_zod.z.object({
      id: import_zod.z.string(),
      rideRequestId: import_zod.z.string(),
      driverId: import_zod.z.string(),
      bidId: import_zod.z.string().default(""),
      status: import_zod.z.enum(["assigned", "accepted", "started", "completed", "cancelled"]).default("assigned"),
      assignedAt: import_zod.z.string(),
      updatedAt: import_zod.z.string()
    });
    BusSeatSchema = import_zod.z.object({
      code: import_zod.z.string().min(1),
      seatType: import_zod.z.string().default("regular")
    });
    BusRouteSchema = import_zod.z.object({
      id: import_zod.z.string(),
      operatorName: import_zod.z.string().min(2),
      operatorCode: import_zod.z.string().default(""),
      fromCity: import_zod.z.string().min(2),
      fromCode: import_zod.z.string().default(""),
      toCity: import_zod.z.string().min(2),
      toCode: import_zod.z.string().default(""),
      departureTime: import_zod.z.string().default(""),
      arrivalTime: import_zod.z.string().default(""),
      durationText: import_zod.z.string().default(""),
      busType: import_zod.z.string().default("Non AC"),
      fare: import_zod.z.number().nonnegative(),
      totalSeats: import_zod.z.number().int().positive().default(20),
      seatLayout: import_zod.z.array(BusSeatSchema).default([]),
      serviceDates: import_zod.z.array(import_zod.z.string()).default([]),
      seatsBookedByDate: import_zod.z.record(import_zod.z.array(import_zod.z.string())).default({}),
      heroImage: import_zod.z.string().default(""),
      active: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string()
    });
    BusBookingSchema = import_zod.z.object({
      id: import_zod.z.string(),
      routeId: import_zod.z.string(),
      userName: import_zod.z.string().min(2),
      email: import_zod.z.string().default(""),
      phone: import_zod.z.string().min(8),
      fromCity: import_zod.z.string().min(2),
      toCity: import_zod.z.string().min(2),
      travelDate: import_zod.z.string(),
      seats: import_zod.z.array(import_zod.z.string()).min(1),
      farePerSeat: import_zod.z.number().nonnegative(),
      totalFare: import_zod.z.number().nonnegative(),
      status: import_zod.z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
      createdAt: import_zod.z.string()
    });
    BikeRentalSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string().min(2),
      location: import_zod.z.string().min(2),
      bikeType: import_zod.z.string().default("Scooter"),
      pricePerHour: import_zod.z.number().nonnegative().default(0),
      pricePerDay: import_zod.z.number().nonnegative().default(0),
      availableQty: import_zod.z.number().int().nonnegative().default(0),
      securityDeposit: import_zod.z.number().nonnegative().default(0),
      helmetIncluded: import_zod.z.boolean().default(true),
      vendorMobile: import_zod.z.string().default(""),
      image: import_zod.z.string().default(""),
      active: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string()
    });
    BikeBookingSchema = import_zod.z.object({
      id: import_zod.z.string(),
      bikeRentalId: import_zod.z.string(),
      userName: import_zod.z.string().min(2),
      email: import_zod.z.string().default(""),
      phone: import_zod.z.string().min(8),
      pickupLocation: import_zod.z.string().default(""),
      dropLocation: import_zod.z.string().default(""),
      startDateTime: import_zod.z.string(),
      endDateTime: import_zod.z.string().optional(),
      hours: import_zod.z.number().int().positive(),
      qty: import_zod.z.number().int().positive().default(1),
      totalFare: import_zod.z.number().nonnegative(),
      status: import_zod.z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
      createdAt: import_zod.z.string()
    });
    MenuItemSchema = import_zod.z.object({
      id: import_zod.z.string(),
      restaurantId: import_zod.z.string(),
      category: import_zod.z.string(),
      name: import_zod.z.string(),
      description: import_zod.z.string().default(""),
      offer: import_zod.z.string().default(""),
      price: import_zod.z.number().nonnegative(),
      mrp: import_zod.z.number().nonnegative().default(0),
      priceDropped: import_zod.z.boolean().default(false),
      priceDropPercent: import_zod.z.number().min(0).max(100).default(0),
      heroImage: import_zod.z.string().default(""),
      image: import_zod.z.string().optional(),
      imageTitles: import_zod.z.array(import_zod.z.string()).default([]),
      imageDescriptions: import_zod.z.array(import_zod.z.string()).default([]),
      imageMeta: import_zod.z.array(ImageMetaSchema).default([]),
      available: import_zod.z.boolean().default(true),
      isVeg: import_zod.z.boolean().default(false),
      tags: import_zod.z.array(import_zod.z.string()).default([]),
      stock: import_zod.z.number().int().nonnegative().default(0),
      maxPerOrder: import_zod.z.number().int().positive().default(10),
      addons: import_zod.z.array(import_zod.z.object({
        name: import_zod.z.string(),
        price: import_zod.z.number().nonnegative()
      })).default([]),
      variants: import_zod.z.array(import_zod.z.object({
        name: import_zod.z.string(),
        price: import_zod.z.number().nonnegative()
      })).default([])
    });
    CartLineItemSchema = import_zod.z.object({
      menuItemId: import_zod.z.string(),
      restaurantId: import_zod.z.string().default(""),
      name: import_zod.z.string(),
      price: import_zod.z.number().nonnegative().default(0),
      quantity: import_zod.z.number().int().nonnegative(),
      isVeg: import_zod.z.boolean().default(false),
      addedAt: import_zod.z.string().default("")
    });
    CartSchema = import_zod.z.object({
      id: import_zod.z.string(),
      userId: import_zod.z.string().default(""),
      phone: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      restaurantId: import_zod.z.string().default(""),
      items: import_zod.z.array(CartLineItemSchema).default([]),
      updatedAt: import_zod.z.string()
    });
    FoodOrderItemSchema = import_zod.z.object({
      menuItemId: import_zod.z.string().optional(),
      restaurantId: import_zod.z.string().optional(),
      name: import_zod.z.string(),
      quantity: import_zod.z.number().int().positive(),
      price: import_zod.z.number().nonnegative()
    });
    FoodOrderSchema = import_zod.z.object({
      id: import_zod.z.string(),
      userId: import_zod.z.string().default(""),
      restaurantId: import_zod.z.string().default(""),
      userName: import_zod.z.string().min(2),
      email: import_zod.z.string().default(""),
      phone: import_zod.z.string().min(8),
      items: import_zod.z.array(FoodOrderItemSchema).min(1),
      deliveryAddress: import_zod.z.string().min(5),
      deliveryPincode: import_zod.z.string().default(""),
      deliveryAddressId: import_zod.z.string().default(""),
      deliveryRegion: import_zod.z.string().default(""),
      specialInstructions: import_zod.z.string().default(""),
      pricing: import_zod.z.object({
        baseAmount: import_zod.z.number().nonnegative(),
        tax: TaxBreakupSchema,
        totalAmount: import_zod.z.number().nonnegative()
      }),
      status: import_zod.z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
      orderTime: import_zod.z.string()
    });
    QuerySchema = import_zod.z.object({
      id: import_zod.z.string(),
      // Identity and subject are only guaranteed on the standalone /contact-us
      // page. The in-order popup collects a message and nothing else — it reads the
      // customer from the logged-in session and synthesises the subject — so these
      // are validated at the route (per submission source) rather than here, and
      // the storage schema accepts whatever the route approved.
      userName: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      phone: import_zod.z.string().default(""),
      subject: import_zod.z.string().default(""),
      message: import_zod.z.string().min(5),
      // Set when the query was raised from inside a My Orders card.
      orderId: import_zod.z.string().default(""),
      orderType: import_zod.z.string().default(""),
      source: import_zod.z.enum(["order_popup", "contact_page"]).default("contact_page"),
      status: import_zod.z.enum(["pending", "resolved", "spam"]).default("pending"),
      submittedAt: import_zod.z.string(),
      respondedAt: import_zod.z.string().nullable().default(null),
      response: import_zod.z.string().nullable().default(null)
    });
    AuditLogSchema = import_zod.z.object({
      id: import_zod.z.string(),
      at: import_zod.z.string(),
      adminChatId: import_zod.z.number().optional(),
      action: import_zod.z.string(),
      entity: import_zod.z.string().optional(),
      entityId: import_zod.z.string().optional(),
      meta: import_zod.z.record(import_zod.z.any()).optional()
    });
    UserOrderRefSchema = import_zod.z.object({
      type: import_zod.z.enum(["booking", "cab", "food", "query"]),
      id: import_zod.z.string(),
      status: import_zod.z.string().default("pending"),
      at: import_zod.z.string().default(""),
      amount: import_zod.z.number().nonnegative().default(0)
    });
    AnalyticsEventSchema = import_zod.z.object({
      id: import_zod.z.string(),
      type: import_zod.z.string(),
      category: import_zod.z.string().default(""),
      userId: import_zod.z.string().default(""),
      phone: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      at: import_zod.z.string(),
      meta: import_zod.z.record(import_zod.z.any()).default({})
    });
    PushNotificationSchema = import_zod.z.object({
      id: import_zod.z.string(),
      title: import_zod.z.string().default("Explore Valley"),
      message: import_zod.z.string().default(""),
      type: import_zod.z.string().default("general"),
      createdAt: import_zod.z.string().default(""),
      deliveredAt: import_zod.z.string().default(""),
      readAt: import_zod.z.string().default(""),
      from: import_zod.z.string().default("")
    });
    UserProfileSchema = import_zod.z.object({
      id: import_zod.z.string(),
      phone: import_zod.z.string(),
      name: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      address: import_zod.z.string().default(""),
      city: import_zod.z.string().default(""),
      state: import_zod.z.string().default(""),
      pincode: import_zod.z.string().default(""),
      landmark: import_zod.z.string().default(""),
      defaultAddressId: import_zod.z.string().default(""),
      ipAddress: import_zod.z.string().default(""),
      browser: import_zod.z.string().default(""),
      password: import_zod.z.string().default(""),
      createdAt: import_zod.z.string(),
      updatedAt: import_zod.z.string(),
      orders: import_zod.z.array(UserOrderRefSchema).default([]),
      pushNotifications: import_zod.z.array(PushNotificationSchema).default([])
    });
    DeliveryPincodeSchema = import_zod.z.object({
      id: import_zod.z.string(),
      pincode: import_zod.z.string().regex(/^[1-9][0-9]{5}$/, "Pincode must be 6 digits"),
      areaName: import_zod.z.string().default(""),
      city: import_zod.z.string().default(""),
      district: import_zod.z.string().default(""),
      state: import_zod.z.string().default(""),
      foodEnabled: import_zod.z.boolean().default(true),
      martEnabled: import_zod.z.boolean().default(true),
      deliveryFee: import_zod.z.number().nonnegative().default(0),
      minOrderValue: import_zod.z.number().nonnegative().default(0),
      codEnabled: import_zod.z.boolean().default(true),
      etaMinutes: import_zod.z.number().int().nonnegative().default(45),
      active: import_zod.z.boolean().default(true),
      notes: import_zod.z.string().default(""),
      createdAt: import_zod.z.string().default(""),
      updatedAt: import_zod.z.string().default("")
    });
    UserAddressSchema = import_zod.z.object({
      id: import_zod.z.string(),
      userId: import_zod.z.string().default(""),
      phone: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      label: import_zod.z.string().default("Home"),
      contactName: import_zod.z.string().default(""),
      contactPhone: import_zod.z.string().default(""),
      addressLine1: import_zod.z.string().min(3),
      addressLine2: import_zod.z.string().default(""),
      landmark: import_zod.z.string().default(""),
      city: import_zod.z.string().default(""),
      state: import_zod.z.string().default(""),
      pincode: import_zod.z.string().regex(/^[1-9][0-9]{5}$/, "Pincode must be 6 digits"),
      deliveryZone: import_zod.z.string().default(""),
      latitude: import_zod.z.number().nullable().default(null),
      longitude: import_zod.z.number().nullable().default(null),
      isDefault: import_zod.z.boolean().default(false),
      active: import_zod.z.boolean().default(true),
      createdAt: import_zod.z.string().default(""),
      updatedAt: import_zod.z.string().default("")
    });
    UserBehaviorProfileSchema = import_zod.z.object({
      id: import_zod.z.string(),
      userId: import_zod.z.string(),
      phone: import_zod.z.string().default(""),
      name: import_zod.z.string().default(""),
      email: import_zod.z.string().default(""),
      coreIdentity: import_zod.z.object({
        profilePhoto: import_zod.z.string().default(""),
        accountId: import_zod.z.string().default(""),
        linkedSocialAccounts: import_zod.z.array(import_zod.z.string()).default([]),
        kycData: import_zod.z.record(import_zod.z.any()).default({}),
        referralCode: import_zod.z.string().default(""),
        referralHistory: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([])
      }).default({}),
      deviceFingerprinting: import_zod.z.object({
        deviceId: import_zod.z.string().default(""),
        osVersion: import_zod.z.string().default(""),
        appVersion: import_zod.z.string().default(""),
        screenSize: import_zod.z.string().default(""),
        language: import_zod.z.string().default(""),
        timezone: import_zod.z.string().default(""),
        ipAddress: import_zod.z.string().default(""),
        ipHistory: import_zod.z.array(import_zod.z.string()).default([]),
        networkType: import_zod.z.string().default(""),
        isp: import_zod.z.string().default(""),
        rootJailbreakSignals: import_zod.z.array(import_zod.z.string()).default([])
      }).default({}),
      locationMobility: import_zod.z.object({
        realtimeGps: import_zod.z.record(import_zod.z.any()).default({}),
        pickupDropLocations: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        savedAddresses: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        routeHistory: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        localityPatterns: import_zod.z.array(import_zod.z.string()).default([]),
        travelFrequency: import_zod.z.number().nonnegative().default(0),
        travelDistanceKm: import_zod.z.number().nonnegative().default(0)
      }).default({}),
      behavioralAnalytics: import_zod.z.object({
        appOpenFrequency: import_zod.z.number().nonnegative().default(0),
        timeSpentPerScreen: import_zod.z.record(import_zod.z.number()).default({}),
        clicksScrollsHesitations: import_zod.z.record(import_zod.z.number()).default({}),
        searchQueries: import_zod.z.array(import_zod.z.string()).default([]),
        abandonedCarts: import_zod.z.number().nonnegative().default(0),
        cancelledRides: import_zod.z.number().nonnegative().default(0),
        retryBehavior: import_zod.z.record(import_zod.z.number()).default({})
      }).default({}),
      transactionPayment: import_zod.z.object({
        orderHistory: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        bookingTimestamps: import_zod.z.array(import_zod.z.string()).default([]),
        paymentMethods: import_zod.z.array(import_zod.z.string()).default([]),
        failedPayments: import_zod.z.number().nonnegative().default(0),
        refunds: import_zod.z.number().nonnegative().default(0),
        chargebacks: import_zod.z.number().nonnegative().default(0),
        tipBehavior: import_zod.z.record(import_zod.z.any()).default({}),
        promoCouponUsage: import_zod.z.array(import_zod.z.string()).default([])
      }).default({}),
      preferencePersonalization: import_zod.z.object({
        cuisinePreferences: import_zod.z.array(import_zod.z.string()).default([]),
        preferredVendors: import_zod.z.array(import_zod.z.string()).default([]),
        priceSensitivity: import_zod.z.string().default(""),
        timeBasedHabits: import_zod.z.array(import_zod.z.string()).default([]),
        rideTypePreference: import_zod.z.string().default("")
      }).default({}),
      ratingsReviewsFeedback: import_zod.z.object({
        ratingsGiven: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        ratingsReceived: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        complaintCategories: import_zod.z.array(import_zod.z.string()).default([]),
        supportChatLogs: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([]),
        callRecordingRefs: import_zod.z.array(import_zod.z.string()).default([])
      }).default({}),
      marketingAttribution: import_zod.z.object({
        adSource: import_zod.z.string().default(""),
        campaignId: import_zod.z.string().default(""),
        pushInteraction: import_zod.z.record(import_zod.z.any()).default({}),
        emailOpenClicks: import_zod.z.record(import_zod.z.any()).default({}),
        inAppBannerClicks: import_zod.z.number().nonnegative().default(0),
        abTestGroups: import_zod.z.array(import_zod.z.string()).default([])
      }).default({}),
      trustSafetyFraud: import_zod.z.object({
        suspiciousBehaviorPatterns: import_zod.z.array(import_zod.z.string()).default([]),
        multipleAccountDetection: import_zod.z.boolean().default(false),
        locationSpoofingSignals: import_zod.z.array(import_zod.z.string()).default([]),
        couponAbuseFlags: import_zod.z.array(import_zod.z.string()).default([]),
        fakeReviewFlags: import_zod.z.array(import_zod.z.string()).default([]),
        accountBansFlags: import_zod.z.array(import_zod.z.string()).default([]),
        lawEnforcementMetadata: import_zod.z.array(import_zod.z.record(import_zod.z.any())).default([])
      }).default({}),
      derivedInferred: import_zod.z.object({
        spendingCapacityScore: import_zod.z.number().default(0),
        loyaltyScore: import_zod.z.number().default(0),
        churnProbability: import_zod.z.number().default(0),
        fraudRiskScore: import_zod.z.number().default(0),
        priceElasticity: import_zod.z.number().default(0),
        deliveryDelayTolerance: import_zod.z.number().default(0),
        surgeAcceptanceLikelihood: import_zod.z.number().default(0)
      }).default({}),
      orders: import_zod.z.array(UserOrderRefSchema).default([]),
      createdAt: import_zod.z.string(),
      updatedAt: import_zod.z.string()
    });
    DatabaseSchema = import_zod.z.object({
      settings: SettingsSchema,
      tours: import_zod.z.array(TourSchema).default([]),
      festivals: import_zod.z.array(FestivalSchema).default([]),
      hotels: import_zod.z.array(HotelSchema).default([]),
      restaurants: import_zod.z.array(RestaurantSchema).default([]),
      bookings: import_zod.z.array(BookingSchema).default([]),
      cabBookings: import_zod.z.array(CabBookingSchema).default([]),
      driverRegistrationRequests: import_zod.z.array(DriverRegistrationRequestSchema).default([]),
      drivers: import_zod.z.array(DriverSchema).default([]),
      driverVehicles: import_zod.z.array(DriverVehicleSchema).default([]),
      driverDocuments: import_zod.z.array(DriverDocumentSchema).default([]),
      driverAvailability: import_zod.z.array(DriverAvailabilitySchema).default([]),
      driverBids: import_zod.z.array(DriverBidSchema).default([]),
      rideAssignments: import_zod.z.array(RideAssignmentSchema).default([]),
      busRoutes: import_zod.z.array(BusRouteSchema).default([]),
      busBookings: import_zod.z.array(BusBookingSchema).default([]),
      bikeRentals: import_zod.z.array(BikeRentalSchema).default([]),
      bikeBookings: import_zod.z.array(BikeBookingSchema).default([]),
      foodOrders: import_zod.z.array(FoodOrderSchema).default([]),
      carts: import_zod.z.array(CartSchema).default([]),
      queries: import_zod.z.array(QuerySchema).default([]),
      menuItems: import_zod.z.array(MenuItemSchema).default([]),
      auditLog: import_zod.z.array(AuditLogSchema).default([]),
      cabProviders: import_zod.z.array(CabProviderSchema).default([]),
      cabRates: import_zod.z.array(CabRateSchema).default([]),
      cabPricing: CabPricingSchema.default({
        baseFare: 120,
        perKm: 14,
        perMin: 2,
        surgeRules: [],
        nightCharges: {
          start: "22:00",
          end: "06:00",
          multiplier: 1.25
        },
        tolls: {
          enabled: false,
          defaultFee: 0
        }
      }),
      serviceAreas: import_zod.z.array(ServiceAreaSchema).default([]),
      coupons: import_zod.z.array(CouponSchema).default([]),
      policies: PoliciesSchema.default({
        hotel: { freeCancelHours: 24, feeAfter: 0.5 },
        tour: { freeCancelHours: 24, feeAfter: 0.5 },
        cab: { freeCancelMinutes: 15, feeAfter: 50 },
        food: { allowCancelMinutes: 5, feeAfter: 20 }
      }),
      payments: PaymentsSchema.default({
        walletEnabled: false,
        refundMethod: "original",
        refundWindowHours: 72
      }),
      userProfiles: import_zod.z.array(UserProfileSchema).default([]),
      userAddresses: import_zod.z.array(UserAddressSchema).default([]),
      deliveryPincodes: import_zod.z.array(DeliveryPincodeSchema).default([]),
      userBehaviorProfiles: import_zod.z.array(UserBehaviorProfileSchema).default([]),
      analyticsEvents: import_zod.z.array(AnalyticsEventSchema).default([]),
      sitePages: SitePagesSchema.default({
        affiliateProgram: { title: "Affiliate Program", slug: "affiliate-program", content: "" },
        contactUs: { title: "Contact Us", slug: "contact-us", content: "" },
        privacyPolicy: { title: "Privacy Policy", slug: "privacy-policy", content: "" },
        refundPolicy: { title: "Refund Policy", slug: "refund-policy", content: "" },
        termsAndConditions: { title: "Terms and Conditions", slug: "terms-and-conditions", content: "" }
      })
    });
  }
});

// vendor/shared/src/ids.ts
function makeId(prefix) {
  const g = globalThis;
  if (g?.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID().replace(/-/g, "")}`;
  }
  try {
    const { randomUUID } = require("crypto");
    if (typeof randomUUID === "function") {
      return `${prefix}_${randomUUID().replace(/-/g, "")}`;
    }
  } catch {
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}
var init_ids = __esm({
  "vendor/shared/src/ids.ts"() {
  }
});

// vendor/shared/src/taxiFares.ts
var init_taxiFares = __esm({
  "vendor/shared/src/taxiFares.ts"() {
  }
});

// vendor/shared/src/index.ts
var init_src = __esm({
  "vendor/shared/src/index.ts"() {
    init_schemas();
    init_ids();
    init_taxiFares();
  }
});

// vendor/server/services/userProfiles.ts
function safeText(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function normalizePhone(phone) {
  const raw = safeText(phone);
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}
function userIdFromPhone(phone) {
  const key = normalizePhone(phone);
  return `user_${key || "unknown"}`;
}
function upsertOrder(orders, entry) {
  const idx = orders.findIndex((x) => x?.type === entry.type && x?.id === entry.id);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...entry };
  } else {
    orders.push(entry);
  }
}
function syncUserProfilesFromOrders(db) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = Array.isArray(db.userProfiles) ? db.userProfiles : [];
  const byPhone = /* @__PURE__ */ new Map();
  existing.forEach((u) => {
    const phone = safeText(u?.phone);
    if (!phone) return;
    byPhone.set(normalizePhone(phone), {
      id: safeText(u?.id || userIdFromPhone(phone)),
      phone,
      name: safeText(u?.name),
      email: safeText(u?.email),
      ipAddress: safeText(u?.ipAddress),
      browser: safeText(u?.browser),
      createdAt: safeText(u?.createdAt || now),
      updatedAt: safeText(u?.updatedAt || now),
      orders: []
    });
  });
  const pull = (phone, seed) => {
    const key = normalizePhone(phone);
    let user = byPhone.get(key);
    if (!user) {
      user = {
        id: userIdFromPhone(phone),
        phone: safeText(phone),
        name: "",
        email: "",
        ipAddress: "",
        browser: "",
        createdAt: now,
        updatedAt: now,
        orders: []
      };
      byPhone.set(key, user);
    }
    if (seed.name) user.name = safeText(seed.name);
    if (seed.email) user.email = safeText(seed.email);
    upsertOrder(user.orders, seed.order);
    user.updatedAt = now;
  };
  (db.bookings || []).forEach((x) => {
    pull(x.phone, {
      name: x.userName,
      email: x.email,
      order: {
        type: "booking",
        id: x.id,
        status: x.status || "pending",
        at: x.bookingDate || "",
        amount: Number(x?.pricing?.totalAmount || 0)
      }
    });
  });
  (db.cabBookings || []).forEach((x) => {
    pull(x.phone, {
      name: x.userName,
      order: {
        type: "cab",
        id: x.id,
        status: x.status || "pending",
        at: x.createdAt || "",
        amount: Number(x?.pricing?.totalAmount || x?.estimatedFare || 0)
      }
    });
  });
  (db.foodOrders || []).forEach((x) => {
    pull(x.phone, {
      name: x.userName,
      order: {
        type: "food",
        id: x.id,
        status: x.status || "pending",
        at: x.orderTime || "",
        amount: Number(x?.pricing?.totalAmount || 0)
      }
    });
  });
  (db.queries || []).forEach((x) => {
    pull(x.phone, {
      name: x.userName,
      email: x.email,
      order: {
        type: "query",
        id: x.id,
        status: x.status || "pending",
        at: x.submittedAt || "",
        amount: 0
      }
    });
  });
  db.userProfiles = Array.from(byPhone.values()).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}
function ensureBehaviorProfile(base, now) {
  return {
    id: safeText(base?.id || ""),
    userId: safeText(base?.userId || ""),
    phone: safeText(base?.phone || ""),
    name: safeText(base?.name || ""),
    email: safeText(base?.email || ""),
    coreIdentity: {
      profilePhoto: safeText(base?.coreIdentity?.profilePhoto || ""),
      accountId: safeText(base?.coreIdentity?.accountId || safeText(base?.userId || "")),
      linkedSocialAccounts: Array.isArray(base?.coreIdentity?.linkedSocialAccounts) ? base.coreIdentity.linkedSocialAccounts : [],
      kycData: base?.coreIdentity?.kycData && typeof base.coreIdentity.kycData === "object" ? base.coreIdentity.kycData : {},
      referralCode: safeText(base?.coreIdentity?.referralCode || ""),
      referralHistory: Array.isArray(base?.coreIdentity?.referralHistory) ? base.coreIdentity.referralHistory : []
    },
    deviceFingerprinting: {
      deviceId: safeText(base?.deviceFingerprinting?.deviceId || ""),
      osVersion: safeText(base?.deviceFingerprinting?.osVersion || ""),
      appVersion: safeText(base?.deviceFingerprinting?.appVersion || ""),
      screenSize: safeText(base?.deviceFingerprinting?.screenSize || ""),
      language: safeText(base?.deviceFingerprinting?.language || ""),
      timezone: safeText(base?.deviceFingerprinting?.timezone || ""),
      ipAddress: safeText(base?.deviceFingerprinting?.ipAddress || ""),
      ipHistory: Array.isArray(base?.deviceFingerprinting?.ipHistory) ? base.deviceFingerprinting.ipHistory : [],
      networkType: safeText(base?.deviceFingerprinting?.networkType || ""),
      isp: safeText(base?.deviceFingerprinting?.isp || ""),
      rootJailbreakSignals: Array.isArray(base?.deviceFingerprinting?.rootJailbreakSignals) ? base.deviceFingerprinting.rootJailbreakSignals : []
    },
    locationMobility: {
      realtimeGps: base?.locationMobility?.realtimeGps && typeof base.locationMobility.realtimeGps === "object" ? base.locationMobility.realtimeGps : {},
      pickupDropLocations: Array.isArray(base?.locationMobility?.pickupDropLocations) ? base.locationMobility.pickupDropLocations : [],
      savedAddresses: Array.isArray(base?.locationMobility?.savedAddresses) ? base.locationMobility.savedAddresses : [],
      routeHistory: Array.isArray(base?.locationMobility?.routeHistory) ? base.locationMobility.routeHistory : [],
      localityPatterns: Array.isArray(base?.locationMobility?.localityPatterns) ? base.locationMobility.localityPatterns : [],
      travelFrequency: Number(base?.locationMobility?.travelFrequency || 0),
      travelDistanceKm: Number(base?.locationMobility?.travelDistanceKm || 0)
    },
    behavioralAnalytics: {
      appOpenFrequency: Number(base?.behavioralAnalytics?.appOpenFrequency || 0),
      timeSpentPerScreen: base?.behavioralAnalytics?.timeSpentPerScreen && typeof base.behavioralAnalytics.timeSpentPerScreen === "object" ? base.behavioralAnalytics.timeSpentPerScreen : {},
      clicksScrollsHesitations: base?.behavioralAnalytics?.clicksScrollsHesitations && typeof base.behavioralAnalytics.clicksScrollsHesitations === "object" ? base.behavioralAnalytics.clicksScrollsHesitations : {},
      searchQueries: Array.isArray(base?.behavioralAnalytics?.searchQueries) ? base.behavioralAnalytics.searchQueries : [],
      abandonedCarts: Number(base?.behavioralAnalytics?.abandonedCarts || 0),
      cancelledRides: Number(base?.behavioralAnalytics?.cancelledRides || 0),
      retryBehavior: base?.behavioralAnalytics?.retryBehavior && typeof base.behavioralAnalytics.retryBehavior === "object" ? base.behavioralAnalytics.retryBehavior : {}
    },
    transactionPayment: {
      orderHistory: Array.isArray(base?.transactionPayment?.orderHistory) ? base.transactionPayment.orderHistory : [],
      bookingTimestamps: Array.isArray(base?.transactionPayment?.bookingTimestamps) ? base.transactionPayment.bookingTimestamps : [],
      paymentMethods: Array.isArray(base?.transactionPayment?.paymentMethods) ? base.transactionPayment.paymentMethods : [],
      failedPayments: Number(base?.transactionPayment?.failedPayments || 0),
      refunds: Number(base?.transactionPayment?.refunds || 0),
      chargebacks: Number(base?.transactionPayment?.chargebacks || 0),
      tipBehavior: base?.transactionPayment?.tipBehavior && typeof base.transactionPayment.tipBehavior === "object" ? base.transactionPayment.tipBehavior : {},
      promoCouponUsage: Array.isArray(base?.transactionPayment?.promoCouponUsage) ? base.transactionPayment.promoCouponUsage : []
    },
    preferencePersonalization: {
      cuisinePreferences: Array.isArray(base?.preferencePersonalization?.cuisinePreferences) ? base.preferencePersonalization.cuisinePreferences : [],
      preferredVendors: Array.isArray(base?.preferencePersonalization?.preferredVendors) ? base.preferencePersonalization.preferredVendors : [],
      priceSensitivity: safeText(base?.preferencePersonalization?.priceSensitivity || ""),
      timeBasedHabits: Array.isArray(base?.preferencePersonalization?.timeBasedHabits) ? base.preferencePersonalization.timeBasedHabits : [],
      rideTypePreference: safeText(base?.preferencePersonalization?.rideTypePreference || "")
    },
    ratingsReviewsFeedback: {
      ratingsGiven: Array.isArray(base?.ratingsReviewsFeedback?.ratingsGiven) ? base.ratingsReviewsFeedback.ratingsGiven : [],
      ratingsReceived: Array.isArray(base?.ratingsReviewsFeedback?.ratingsReceived) ? base.ratingsReviewsFeedback.ratingsReceived : [],
      complaintCategories: Array.isArray(base?.ratingsReviewsFeedback?.complaintCategories) ? base.ratingsReviewsFeedback.complaintCategories : [],
      supportChatLogs: Array.isArray(base?.ratingsReviewsFeedback?.supportChatLogs) ? base.ratingsReviewsFeedback.supportChatLogs : [],
      callRecordingRefs: Array.isArray(base?.ratingsReviewsFeedback?.callRecordingRefs) ? base.ratingsReviewsFeedback.callRecordingRefs : []
    },
    marketingAttribution: {
      adSource: safeText(base?.marketingAttribution?.adSource || ""),
      campaignId: safeText(base?.marketingAttribution?.campaignId || ""),
      pushInteraction: base?.marketingAttribution?.pushInteraction && typeof base.marketingAttribution.pushInteraction === "object" ? base.marketingAttribution.pushInteraction : {},
      emailOpenClicks: base?.marketingAttribution?.emailOpenClicks && typeof base.marketingAttribution.emailOpenClicks === "object" ? base.marketingAttribution.emailOpenClicks : {},
      inAppBannerClicks: Number(base?.marketingAttribution?.inAppBannerClicks || 0),
      abTestGroups: Array.isArray(base?.marketingAttribution?.abTestGroups) ? base.marketingAttribution.abTestGroups : []
    },
    trustSafetyFraud: {
      suspiciousBehaviorPatterns: Array.isArray(base?.trustSafetyFraud?.suspiciousBehaviorPatterns) ? base.trustSafetyFraud.suspiciousBehaviorPatterns : [],
      multipleAccountDetection: !!base?.trustSafetyFraud?.multipleAccountDetection,
      locationSpoofingSignals: Array.isArray(base?.trustSafetyFraud?.locationSpoofingSignals) ? base.trustSafetyFraud.locationSpoofingSignals : [],
      couponAbuseFlags: Array.isArray(base?.trustSafetyFraud?.couponAbuseFlags) ? base.trustSafetyFraud.couponAbuseFlags : [],
      fakeReviewFlags: Array.isArray(base?.trustSafetyFraud?.fakeReviewFlags) ? base.trustSafetyFraud.fakeReviewFlags : [],
      accountBansFlags: Array.isArray(base?.trustSafetyFraud?.accountBansFlags) ? base.trustSafetyFraud.accountBansFlags : [],
      lawEnforcementMetadata: Array.isArray(base?.trustSafetyFraud?.lawEnforcementMetadata) ? base.trustSafetyFraud.lawEnforcementMetadata : []
    },
    derivedInferred: {
      spendingCapacityScore: Number(base?.derivedInferred?.spendingCapacityScore || 0),
      loyaltyScore: Number(base?.derivedInferred?.loyaltyScore || 0),
      churnProbability: Number(base?.derivedInferred?.churnProbability || 0),
      fraudRiskScore: Number(base?.derivedInferred?.fraudRiskScore || 0),
      priceElasticity: Number(base?.derivedInferred?.priceElasticity || 0),
      deliveryDelayTolerance: Number(base?.derivedInferred?.deliveryDelayTolerance || 0),
      surgeAcceptanceLikelihood: Number(base?.derivedInferred?.surgeAcceptanceLikelihood || 0)
    },
    orders: Array.isArray(base?.orders) ? base.orders : [],
    createdAt: safeText(base?.createdAt || now),
    updatedAt: safeText(base?.updatedAt || now)
  };
}
function syncUserBehaviorProfilesFromData(db) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const profiles = Array.isArray(db.userProfiles) ? db.userProfiles : [];
  const existing = Array.isArray(db.userBehaviorProfiles) ? db.userBehaviorProfiles : [];
  const byUserId = /* @__PURE__ */ new Map();
  existing.forEach((x) => {
    const id = safeText(x?.userId);
    if (!id) return;
    byUserId.set(id, ensureBehaviorProfile(x, now));
  });
  profiles.forEach((u) => {
    const userId = safeText(u?.id || userIdFromPhone(u?.phone || ""));
    if (!userId) return;
    const current = byUserId.get(userId) || ensureBehaviorProfile({
      id: `behavior_${userId}`,
      userId,
      phone: safeText(u?.phone),
      name: safeText(u?.name),
      email: safeText(u?.email),
      orders: Array.isArray(u?.orders) ? u.orders : [],
      createdAt: safeText(u?.createdAt || now),
      updatedAt: now
    }, now);
    current.userId = userId;
    current.phone = safeText(u?.phone || current.phone);
    current.name = safeText(u?.name || current.name);
    current.email = safeText(u?.email || current.email);
    current.coreIdentity.accountId = userId;
    current.deviceFingerprinting.ipAddress = safeText(u?.ipAddress || current.deviceFingerprinting.ipAddress);
    if (u?.ipAddress) {
      const hist = Array.isArray(current.deviceFingerprinting.ipHistory) ? current.deviceFingerprinting.ipHistory : [];
      if (!hist.includes(String(u.ipAddress))) hist.push(String(u.ipAddress));
      current.deviceFingerprinting.ipHistory = hist.slice(-30);
    }
    current.orders = Array.isArray(u?.orders) ? u.orders : [];
    current.transactionPayment.orderHistory = current.orders.map((o) => ({ ...o }));
    current.transactionPayment.bookingTimestamps = current.orders.map((o) => safeText(o?.at)).filter(Boolean);
    current.transactionPayment.paymentMethods = Array.from(new Set(current.transactionPayment.paymentMethods || []));
    current.transactionPayment.failedPayments = Number(current.transactionPayment.failedPayments || 0);
    current.transactionPayment.refunds = Number(current.transactionPayment.refunds || 0);
    current.transactionPayment.chargebacks = Number(current.transactionPayment.chargebacks || 0);
    const totalSpend = current.orders.reduce((s, o) => s + Number(o?.amount || 0), 0);
    const orderCount = current.orders.length;
    current.derivedInferred.spendingCapacityScore = Math.round(totalSpend);
    current.derivedInferred.loyaltyScore = Math.min(100, orderCount * 5);
    current.derivedInferred.churnProbability = orderCount > 0 ? Number((1 / (orderCount + 1)).toFixed(4)) : 1;
    current.derivedInferred.fraudRiskScore = current.trustSafetyFraud.multipleAccountDetection ? 70 : 10;
    current.derivedInferred.priceElasticity = Number((orderCount > 0 ? Math.min(1, 1e3 / (totalSpend + 1)) : 0).toFixed(4));
    current.derivedInferred.deliveryDelayTolerance = Number(current.derivedInferred.deliveryDelayTolerance || 0);
    current.derivedInferred.surgeAcceptanceLikelihood = Number((orderCount > 0 ? Math.min(1, totalSpend / (orderCount * 1e3 + 1)) : 0).toFixed(4));
    current.updatedAt = now;
    byUserId.set(userId, current);
  });
  db.userBehaviorProfiles = Array.from(byUserId.values()).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}
var init_userProfiles = __esm({
  "vendor/server/services/userProfiles.ts"() {
  }
});

// vendor/server/services/operationalRules.ts
function safeText2(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function norm(v) {
  return safeText2(v).toLowerCase();
}
function isBookingActive(status) {
  const s = norm(status);
  return s === "pending" || s === "confirmed" || s === "completed";
}
function isFoodConsuming(status) {
  const s = norm(status);
  return s === "confirmed" || s === "completed";
}
function parseDateValue(v) {
  if (!v) return null;
  const d = /* @__PURE__ */ new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function eachDate(start, end) {
  const s = parseDateValue(start);
  const e = parseDateValue(end);
  if (!s || !e || e <= s) return [];
  const out = [];
  for (let d = new Date(s); d < e; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}
function computeFoodConsumptionMap(orders) {
  const out = /* @__PURE__ */ new Map();
  for (const o of orders || []) {
    if (!isFoodConsuming(o?.status)) continue;
    const items = Array.isArray(o?.items) ? o.items : [];
    for (const it of items) {
      const byId = safeText2(it?.menuItemId);
      const key = byId ? `id:${byId}` : `name:${norm(it?.name)}`;
      if (!key) continue;
      const q = Math.max(0, Number(it?.quantity || 0));
      if (!q) continue;
      out.set(key, Number(out.get(key) || 0) + q);
    }
  }
  return out;
}
function pickMenuItemByKey(db, itemKey) {
  if (itemKey.startsWith("id:")) {
    const id = itemKey.slice(3);
    return (db.menuItems || []).find((m) => safeText2(m?.id) === id) || null;
  }
  const nameKey = itemKey.startsWith("name:") ? itemKey.slice(5) : itemKey;
  const candidates = (db.menuItems || []).filter((m) => norm(m?.name) === nameKey);
  if (!candidates.length) return null;
  candidates.sort((a, b) => Number(b?.stock || 0) - Number(a?.stock || 0));
  return candidates[0];
}
function applyFoodStockTransitions(prev, next) {
  const prevMap = computeFoodConsumptionMap(prev.foodOrders || []);
  const nextMap = computeFoodConsumptionMap(next.foodOrders || []);
  const keys = /* @__PURE__ */ new Set([...Array.from(prevMap.keys()), ...Array.from(nextMap.keys())]);
  for (const itemKey of keys) {
    const prevQty = Number(prevMap.get(itemKey) || 0);
    const nextQty = Number(nextMap.get(itemKey) || 0);
    const delta = nextQty - prevQty;
    if (!delta) continue;
    const menu = pickMenuItemByKey(next, itemKey);
    if (!menu) continue;
    const currentStock = Number(menu.stock || 0);
    if (delta > 0 && currentStock < delta) {
      throw new Error(`OUT_OF_STOCK_FOR_CONFIRMED_ORDER:${menu.name}`);
    }
    menu.stock = Math.max(0, currentStock - delta);
    if (menu.stock === 0) menu.available = false;
    if (menu.stock > 0 && menu.available === false) menu.available = true;
  }
}
function validateTourBookingCapacity(next, booking) {
  if (norm(booking?.type) !== "tour" || !isBookingActive(booking?.status)) return;
  const itemId = safeText2(booking?.itemId);
  const date = safeText2(booking?.tourDate);
  const guests = Math.max(0, Number(booking?.guests || 0));
  if (!itemId || !date || guests <= 0) throw new Error("INVALID_TOUR_BOOKING_DATA");
  const tour = (next.tours || []).find((t) => safeText2(t?.id) === itemId && t?.available !== false);
  if (!tour) throw new Error("TOUR_UNAVAILABLE");
  const closedDates = Array.isArray(tour.availability?.closedDates) ? tour.availability.closedDates : [];
  if (closedDates.includes(date)) throw new Error("TOUR_DATE_CLOSED");
  const capacity = Number(tour.availability?.capacityByDate?.[date] ?? tour.maxGuests ?? 0);
  const totalGuests = (next.bookings || []).filter((x) => norm(x?.type) === "tour" && isBookingActive(x?.status)).filter((x) => safeText2(x?.itemId) === itemId && safeText2(x?.tourDate) === date).reduce((sum, x) => sum + Math.max(0, Number(x?.guests || 0)), 0);
  if (totalGuests > capacity) throw new Error("TOUR_OCCUPANCY_FULL");
}
function validateHotelBookingCapacity(next, booking) {
  if (norm(booking?.type) !== "hotel" || !isBookingActive(booking?.status)) return;
  const itemId = safeText2(booking?.itemId);
  const roomType = safeText2(booking?.roomType);
  const checkIn = safeText2(booking?.checkIn);
  const checkOut = safeText2(booking?.checkOut);
  const guests = Math.max(0, Number(booking?.guests || 0));
  const numRooms = Math.max(1, Number(booking?.numRooms || 1));
  if (!itemId || !roomType || !checkIn || !checkOut || guests <= 0) throw new Error("INVALID_HOTEL_BOOKING_DATA");
  const hotel = (next.hotels || []).find((h) => safeText2(h?.id) === itemId && h?.available !== false);
  if (!hotel) throw new Error("HOTEL_UNAVAILABLE");
  const rt = (hotel.roomTypes || []).find((x) => safeText2(x?.type) === roomType);
  if (!rt) throw new Error("ROOM_TYPE_UNAVAILABLE");
  if (guests > Number(rt.capacity || 0) * numRooms) throw new Error("HOTEL_ROOM_CAPACITY_EXCEEDED");
  const stayDates = eachDate(checkIn, checkOut);
  if (!stayDates.length) throw new Error("INVALID_STAY_RANGE");
  const closedDates = Array.isArray(hotel.availability?.closedDates) ? hotel.availability.closedDates : [];
  if (stayDates.some((d) => closedDates.includes(d))) throw new Error("HOTEL_DATE_CLOSED");
  const totalRoomsForType = hotel.availability?.roomsByType?.[roomType];
  if (typeof totalRoomsForType !== "number") return;
  for (const day of stayDates) {
    const used = (next.bookings || []).filter((x) => norm(x?.type) === "hotel" && isBookingActive(x?.status)).filter((x) => safeText2(x?.itemId) === itemId && safeText2(x?.roomType) === roomType).filter((x) => eachDate(x?.checkIn, x?.checkOut).includes(day)).reduce((sum, x) => sum + Math.max(1, Number(x?.numRooms || 1)), 0);
    if (used > totalRoomsForType) throw new Error("HOTEL_OCCUPANCY_FULL");
  }
}
function changedBookingIds(prev, next) {
  const prevById = new Map((prev.bookings || []).map((x) => [safeText2(x?.id), x]));
  const nextById = new Map((next.bookings || []).map((x) => [safeText2(x?.id), x]));
  const ids = /* @__PURE__ */ new Set([...Array.from(prevById.keys()), ...Array.from(nextById.keys())]);
  const changed = [];
  for (const id of ids) {
    const a = prevById.get(id);
    const b = nextById.get(id);
    if (!a || !b) {
      changed.push(id);
      continue;
    }
    const fingerprintA = JSON.stringify({
      type: a.type,
      itemId: a.itemId,
      status: a.status,
      guests: a.guests,
      roomType: a.roomType,
      numRooms: a.numRooms,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      tourDate: a.tourDate
    });
    const fingerprintB = JSON.stringify({
      type: b.type,
      itemId: b.itemId,
      status: b.status,
      guests: b.guests,
      roomType: b.roomType,
      numRooms: b.numRooms,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      tourDate: b.tourDate
    });
    if (fingerprintA !== fingerprintB) changed.push(id);
  }
  return changed;
}
function applyOperationalRules(prev, next) {
  applyFoodStockTransitions(prev, next);
  const nextById = new Map((next.bookings || []).map((x) => [safeText2(x?.id), x]));
  const changedIds = changedBookingIds(prev, next);
  for (const id of changedIds) {
    const booking = nextById.get(id);
    if (!booking) continue;
    if (norm(booking.type) === "tour") validateTourBookingCapacity(next, booking);
    if (norm(booking.type) === "hotel") validateHotelBookingCapacity(next, booking);
  }
}
var init_operationalRules = __esm({
  "vendor/server/services/operationalRules.ts"() {
  }
});

// vendor/server/services/foodPricing.ts
function parseMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}
function deriveMenuItemMrp(basePrice) {
  const base = parseMoney(basePrice);
  if (base <= 0) return 0;
  return Math.round(base * (1 + FOOD_MRP_MARKUP_PERCENT / 100));
}
var FOOD_MRP_MARKUP_PERCENT;
var init_foodPricing = __esm({
  "vendor/server/services/foodPricing.ts"() {
    FOOD_MRP_MARKUP_PERCENT = (() => {
      const raw = Number(process.env.FOOD_MRP_MARKUP_PERCENT);
      return Number.isFinite(raw) && raw >= 0 ? raw : 10;
    })();
  }
});

// vendor/server/services/jsondb.ts
var jsondb_exports = {};
__export(jsondb_exports, {
  invalidateDatabaseCache: () => invalidateDatabaseCache,
  mutateData: () => mutateData,
  readData: () => readData,
  writeData: () => writeData
});
function resolveStoredMenuMrp(rawMrp, rawPrice) {
  const price = Math.max(0, Number(rawPrice || 0) || 0);
  const mrp = Math.max(0, Number(rawMrp || 0) || 0);
  if (mrp > 0) return Math.max(mrp, price);
  return deriveMenuItemMrp(price);
}
function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}
function supabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
}
function supabaseUserProfileTable() {
  return String(process.env.SUPABASE_USER_PROFILE_TABLE || "ev_user_profiles").trim() || "ev_user_profiles";
}
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function safeText3(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function slugToken(v, fallback = "item", maxLen = 32) {
  const s = safeText3(v).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const clipped = s.slice(0, maxLen);
  return clipped || fallback;
}
function makeStableMenuItemId(restaurantId, itemName, suffix = 0) {
  const restaurant = slugToken(restaurantId, "vendor", 24);
  const item = slugToken(itemName, "item", 24);
  return suffix > 0 ? `menu_${restaurant}_${item}_${suffix + 1}` : `menu_${restaurant}_${item}`;
}
function normalizeMenuLookupKey(name, category) {
  const normalizedName = safeText3(name).toLowerCase().replace(/\s+/g, " ");
  const normalizedCategory = safeText3(category || "General").toLowerCase().replace(/\s+/g, " ");
  return `${normalizedName}::${normalizedCategory}`;
}
function normalizeMenuItemRowsForSupabase(rows) {
  const dedupedRows = [];
  const indexByKey = /* @__PURE__ */ new Map();
  const generatedCounts = /* @__PURE__ */ new Map();
  (Array.isArray(rows) ? rows : []).forEach((rawRow, idx) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const restaurantId = safeText3(rawRow?.restaurant_id || rawRow?.restaurantId || "");
    const itemName = safeText3(rawRow?.name || "");
    const category = safeText3(rawRow?.category || "General") || "General";
    if (!itemName) return;
    let id = safeText3(rawRow?.id || "");
    if (!id) {
      const counterKey = `${restaurantId}::${itemName.toLowerCase()}`;
      const seenCount = generatedCounts.get(counterKey) || 0;
      id = makeStableMenuItemId(restaurantId, itemName, seenCount);
      generatedCounts.set(counterKey, seenCount + 1);
    }
    const row = {
      ...rawRow,
      id,
      restaurant_id: restaurantId,
      category,
      name: itemName
    };
    const key = `id:${id}`;
    const existingIdx = indexByKey.get(key);
    if (existingIdx === void 0) {
      indexByKey.set(key, dedupedRows.length);
      dedupedRows.push(row);
      return;
    }
    dedupedRows[existingIdx] = {
      ...dedupedRows[existingIdx],
      ...row
    };
  });
  return dedupedRows;
}
function dedupeUserProfilesByEmail(rows) {
  const byEmail = /* @__PURE__ */ new Map();
  const noEmail = [];
  const ts = (v) => {
    const n = new Date(String(v || "")).getTime();
    return Number.isFinite(n) ? n : 0;
  };
  for (const row of rows || []) {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email) {
      noEmail.push(row);
      continue;
    }
    const prev = byEmail.get(email);
    if (!prev) {
      byEmail.set(email, row);
      continue;
    }
    const prevTs = Math.max(ts(prev?.updated_at), ts(prev?.created_at), ts(prev?.updatedAt), ts(prev?.createdAt));
    const nextTs = Math.max(ts(row?.updated_at), ts(row?.created_at), ts(row?.updatedAt), ts(row?.createdAt));
    if (nextTs >= prevTs) byEmail.set(email, row);
  }
  return [...noEmail, ...Array.from(byEmail.values())];
}
function isUserProfilesDuplicateEmailError(err) {
  const msg = String(err && (err.message || err) || "");
  const table = supabaseUserProfileTable();
  return msg.includes(`${table}_email_unique_idx`) || msg.includes('"code":"23505"') && msg.toLowerCase().includes("email");
}
function dedupeUserBehaviorProfiles(rows) {
  const byKey = /* @__PURE__ */ new Map();
  const stamp = (row) => {
    const ts = Date.parse(String(row?.updated_at || row?.updatedAt || row?.created_at || row?.createdAt || ""));
    return Number.isFinite(ts) ? ts : 0;
  };
  const orderKey = (order) => {
    return JSON.stringify({
      type: String(order?.type || ""),
      id: String(order?.id || ""),
      at: String(order?.at || ""),
      amount: Number(order?.amount || 0),
      status: String(order?.status || "")
    });
  };
  const merge = (current, incoming) => {
    if (!current) return incoming;
    const preferred = stamp(incoming) >= stamp(current) ? incoming : current;
    const secondary = preferred === incoming ? current : incoming;
    const mergedOrders = [
      ...Array.isArray(current?.orders) ? current.orders : [],
      ...Array.isArray(incoming?.orders) ? incoming.orders : []
    ];
    const seenOrders = /* @__PURE__ */ new Set();
    const nextOrders = mergedOrders.filter((order) => {
      const key = orderKey(order);
      if (seenOrders.has(key)) return false;
      seenOrders.add(key);
      return true;
    });
    return {
      ...secondary,
      ...preferred,
      orders: nextOrders
    };
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.id || "").trim();
    const userId = String(row?.user_id || row?.userId || "").trim();
    const phone = String(row?.phone || "").trim();
    const email = String(row?.email || "").trim().toLowerCase();
    const key = id || userId || `phone:${phone}` || `email:${email}`;
    if (!key) continue;
    byKey.set(key, merge(byKey.get(key), row));
  }
  return Array.from(byKey.values());
}
function assertSupabaseConfigured() {
  if (!supabaseUrl() || !supabaseServiceRoleKey()) {
    throw new Error("SUPABASE_NOT_CONFIGURED: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
}
function shouldUseSupabase() {
  return FORCE_SUPABASE || !!supabaseUrl() && !!supabaseServiceRoleKey();
}
async function loadLocalDatabase() {
  if (!warnedLocal) {
    warnedLocal = true;
    console.warn("[jsondb] Supabase not configured. Falling back to local data.json.");
  }
  await import_fs_extra.default.ensureDir(import_path3.default.dirname(LOCAL_DB_PATH));
  const exists = await import_fs_extra.default.pathExists(LOCAL_DB_PATH);
  if (!exists) {
    const seed = DatabaseSchema.parse({
      settings: DEFAULT_SETTINGS,
      policies: DEFAULT_POLICIES,
      payments: DEFAULT_PAYMENTS,
      sitePages: DEFAULT_SITE_PAGES
    });
    await import_fs_extra.default.writeFile(LOCAL_DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  const raw = await import_fs_extra.default.readFile(LOCAL_DB_PATH, "utf8");
  const parsed = raw.trim() ? JSON.parse(raw) : {};
  const normalized = DatabaseSchema.parse({
    settings: parsed.settings || DEFAULT_SETTINGS,
    policies: parsed.policies || DEFAULT_POLICIES,
    payments: parsed.payments || DEFAULT_PAYMENTS,
    sitePages: parsed.sitePages || DEFAULT_SITE_PAGES,
    ...parsed
  });
  return normalized;
}
async function writeLocalDatabase(db) {
  await import_fs_extra.default.ensureDir(import_path3.default.dirname(LOCAL_DB_PATH));
  await import_fs_extra.default.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  invalidateDatabaseCache();
}
function supabaseHeaders(extra) {
  const serviceKey = supabaseServiceRoleKey();
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra || {}
  };
}
async function supabaseSelect(table, query = "select=*") {
  const url = `${supabaseUrl()}/rest/v1/${table}?${query}`;
  const r = await fetch(url, { headers: supabaseHeaders() });
  if (!r.ok) throw new Error(`${table}_SELECT_FAILED:${r.status}:${await r.text()}`);
  return r.json();
}
async function supabaseSelectPage(table, query, wantCount) {
  const url = `${supabaseUrl()}/rest/v1/${table}?${query}`;
  const headers = wantCount ? supabaseHeaders({ Prefer: "count=exact" }) : supabaseHeaders();
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${table}_SELECT_FAILED:${r.status}:${await r.text()}`);
  const rows = await r.json();
  let total = null;
  if (wantCount) {
    const parsed = Number(String(r.headers.get("content-range") || "").split("/")[1]);
    total = Number.isFinite(parsed) ? parsed : null;
  }
  return { rows, total };
}
async function supabaseSelectAll(table, pageSize = 1e3, orderColumn = "id") {
  const order = encodeURIComponent(orderColumn);
  const pageQuery = (offset) => `select=*&order=${order}.asc&limit=${pageSize}&offset=${offset}`;
  const first = await supabaseSelectPage(table, pageQuery(0), true);
  if (first.rows.length < pageSize) return first.rows;
  if (first.total === null) {
    const all = [...first.rows];
    let offset = pageSize;
    while (true) {
      const page = await supabaseSelect(table, pageQuery(offset));
      all.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    return all;
  }
  const offsets = [];
  for (let o = pageSize; o < first.total; o += pageSize) offsets.push(o);
  if (!offsets.length) return first.rows;
  const pages = new Array(offsets.length);
  let nextIndex = 0;
  const worker = async () => {
    for (; ; ) {
      const i = nextIndex++;
      if (i >= offsets.length) return;
      pages[i] = await supabaseSelect(table, pageQuery(offsets[i]));
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(SELECT_PAGE_CONCURRENCY, offsets.length) }, worker)
  );
  return first.rows.concat(...pages);
}
function isMissingTableError(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("PGRST205") || msg.includes("does not exist");
}
function isTransientSupabaseReadError(err) {
  const msg = String(err?.message || err || "");
  return /_SELECT_FAILED:5\d{2}:/i.test(msg) || msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("Bad gateway") || msg.includes("Gateway Timeout") || msg.includes("The web server reported a bad gateway error") || msg.includes("upstream connect error");
}
function shouldFallbackToLocalOnSupabaseError(err) {
  return FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR && isTransientSupabaseReadError(err);
}
function isSupabaseDuplicateConflictBatchError(err) {
  const msg = String(err?.message || err || "");
  return msg.includes('{"code":"21000"') || msg.includes("ON CONFLICT DO UPDATE command cannot affect row a second time");
}
async function supabaseSelectAllIfExists(table, pageSize = 1e3, orderColumn = "id") {
  try {
    return await supabaseSelectAll(table, pageSize, orderColumn);
  } catch (err) {
    if (isMissingTableError(err)) return [];
    if (isTransientSupabaseReadError(err)) {
      console.warn(`[jsondb] ${table} select skipped due to transient Supabase read failure:`, String(err?.message || err));
      return [];
    }
    throw err;
  }
}
function dedupeByConflictKey(rows, onConflict) {
  const keys = String(onConflict || "id").split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return rows;
  const positionByKey = /* @__PURE__ */ new Map();
  const out = [];
  rows.forEach((row) => {
    const key = keys.map((k) => String(row?.[k] ?? "")).join("\0");
    const existing = positionByKey.get(key);
    if (existing === void 0) {
      positionByKey.set(key, out.length);
      out.push(row);
    } else {
      out[existing] = row;
    }
  });
  return out;
}
async function supabaseUpsert(table, rows, onConflict = "id") {
  if (!rows.length) return;
  rows = dedupeByConflictKey(rows, onConflict);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) {
      const errorText = await r.text();
      const error = new Error(`${table}_UPSERT_FAILED:${r.status}:${errorText}`);
      if ((table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) && chunk.length > 1 && isSupabaseDuplicateConflictBatchError(error)) {
        for (const row of chunk) {
          await supabaseUpsert(table, [row], onConflict);
        }
        continue;
      }
      throw error;
    }
  }
}
async function supabaseInsertIgnoreDuplicates(table, rows, onConflict = "id") {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=ignore-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) throw new Error(`${table}_INSERT_FAILED:${r.status}:${await r.text()}`);
  }
}
async function supabaseUpsertWithOptionalPriceFields(table, rows, onConflict = "id") {
  const optionalColumns = [
    "mrp",
    "price_dropped",
    "price_drop_percent",
    "image_meta",
    "hero_image",
    "image_titles",
    "image_descriptions",
    "vendor_mobile",
    "additional_comments",
    // WP-Travel-like tour enrichment / i18n (backward compatible).
    "map_embed_url",
    "faqs",
    "itinerary_items",
    "facts",
    "content_blocks",
    "i18n",
    // WP-Travel-like booking enrichment (backward compatible).
    "country_code",
    "paid_amount",
    "email",
    // Food orders enrichment (backward compatible).
    "user_id",
    "restaurant_id",
    "delivery_pincode",
    "delivery_address_id",
    "delivery_region",
    // Customer profile address (backward compatible — see
    // server/sql/add_delivery_pincodes_and_user_addresses.sql).
    "address",
    "city",
    "state",
    "pincode",
    "landmark",
    "default_address_id",
    // Customer notification bell (backward compatible — see
    // server/sql/add_user_push_notifications.sql). Until that runs the column
    // is stripped and the notification is simply not stored.
    "push_notifications",
    // Settings (backward compatible).
    "page_slugs",
    // Support queries raised from inside an order (backward compatible — see
    // server/sql/add_query_order_link.sql).
    "order_id",
    "order_type",
    "source",
    // Desk-quoted taxi fares (backward compatible — see
    // server/sql/add_cab_quote_fields.sql).
    "booking_mode",
    "quoted_fare",
    "quoted_at",
    "quoted_by",
    "quote_status",
    // Which Razorpay charge paid for a booking (backward compatible — see
    // server/sql/add_booking_payment_reference.sql). Until that runs the columns
    // are stripped and the booking simply saves without its payment reference,
    // rather than the whole write failing.
    "razorpay_payment_id",
    "razorpay_order_id"
  ];
  let workingRows = rows.map((r) => ({ ...r }));
  const removed = /* @__PURE__ */ new Set();
  for (; ; ) {
    try {
      await supabaseUpsert(table, workingRows, onConflict);
      return;
    } catch (err) {
      const msg = String(err?.message || err || "");
      const hit = optionalColumns.find((c) => msg.includes(c) && !removed.has(c));
      if (!hit) throw err;
      removed.add(hit);
      workingRows = workingRows.map((r) => {
        const copy = { ...r };
        delete copy[hit];
        return copy;
      });
    }
  }
}
function buildImageMeta(images, titles, descriptions) {
  const maxLen = Math.max(images.length, titles.length, descriptions.length);
  const out = [];
  for (let i = 0; i < maxLen; i += 1) {
    const url = String(images[i] || "");
    const title = String(titles[i] || "");
    const description = String(descriptions[i] || "");
    if (url || title || description) out.push({ url, title, description });
  }
  return out;
}
function extractImageTitles(meta, fallbackTitles = []) {
  if (Array.isArray(fallbackTitles) && fallbackTitles.length) return fallbackTitles.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.title || ""));
}
function extractImageDescriptions(meta, fallbackDescriptions = []) {
  if (Array.isArray(fallbackDescriptions) && fallbackDescriptions.length) return fallbackDescriptions.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.description || ""));
}
function normalizeImagePayload(imagesRaw, titlesRaw, descriptionsRaw, metaRaw) {
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];
  const titles = Array.isArray(titlesRaw) ? titlesRaw : [];
  const descriptions = Array.isArray(descriptionsRaw) ? descriptionsRaw : [];
  const meta = Array.isArray(metaRaw) ? metaRaw : [];
  const hasObjectImages = images.some((x) => x && typeof x === "object");
  if (hasObjectImages) {
    const normalizedMeta = images.map((x) => {
      const o = x && typeof x === "object" ? x : { url: x };
      return {
        url: String(o.url || o.src || ""),
        title: String(o.title || ""),
        description: String(o.description || "")
      };
    }).filter((x) => x.url || x.title || x.description);
    return {
      images: normalizedMeta.map((x) => x.url).filter(Boolean),
      imageTitles: normalizedMeta.map((x) => x.title),
      imageDescriptions: normalizedMeta.map((x) => x.description),
      imageMeta: normalizedMeta
    };
  }
  const imageStrings = images.map((x) => String(x || "")).filter(Boolean);
  const metaFinal = meta.length ? meta : buildImageMeta(imageStrings, titles, descriptions);
  return {
    images: imageStrings,
    imageTitles: extractImageTitles(metaFinal, titles),
    imageDescriptions: extractImageDescriptions(metaFinal, descriptions),
    imageMeta: metaFinal
  };
}
function toIsoStringOrNow(v) {
  if (!v) return nowISO();
  return String(v);
}
function nullableText(v) {
  if (v === null || v === void 0 || v === "") return void 0;
  return String(v);
}
function safeJsonParseObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || !(t.startsWith("{") || t.startsWith("["))) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
function normalizeTaxBreakup(raw, baseAmount, totalAmount) {
  const input = raw && typeof raw === "object" ? raw : safeJsonParseObject(raw) || {};
  const gstRate = Number(input.gstRate ?? input.gst_rate ?? input.rate ?? 0) || 0;
  const taxableValue = Number(input.taxableValue ?? input.taxable_value ?? baseAmount) || 0;
  const inferredGst = Math.max(0, Number(input.gstAmount ?? input.gst_amount ?? totalAmount - baseAmount) || 0);
  const cgst = Number(input.cgst ?? 0) || 0;
  const sgst = Number(input.sgst ?? 0) || 0;
  const igst = Number(input.igst ?? 0) || 0;
  return {
    gstRate: Math.max(0, Math.min(1, gstRate)),
    taxableValue: Math.max(0, taxableValue),
    gstAmount: Math.max(0, inferredGst),
    cgst: Math.max(0, cgst),
    sgst: Math.max(0, sgst),
    igst: Math.max(0, igst)
  };
}
function normalizeFoodOrderItems(items, restaurantId) {
  const parsed = safeJsonParseObject(items);
  const list = Array.isArray(items) ? items : Array.isArray(parsed) ? parsed : [];
  return list.map((it) => {
    const qty = it?.quantity ?? it?.qty ?? it?.count ?? it?.q ?? 1;
    return {
      menuItemId: nullableText(it?.menuItemId ?? it?.menu_item_id ?? it?.id) || void 0,
      restaurantId: nullableText(it?.restaurantId ?? it?.restaurant_id ?? restaurantId) || void 0,
      name: String(it?.name ?? it?.title ?? "").trim() || "Item",
      quantity: Math.max(1, Number(qty || 1)),
      price: Math.max(0, Number(it?.price ?? it?.amount ?? 0) || 0)
    };
  }).filter((x) => x.name && x.quantity > 0);
}
function normalizeFoodPricing(rawPricing, items) {
  const p = rawPricing && typeof rawPricing === "object" ? rawPricing : safeJsonParseObject(rawPricing) || {};
  const totalAmount = Number(p.totalAmount ?? p.total_amount ?? p.total ?? 0) || 0;
  const baseCandidate = Number(p.baseAmount ?? p.base_amount ?? p.subtotal ?? 0) || 0;
  const sumItems = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.price || 0), 0);
  const baseAmount = Math.max(0, baseCandidate || sumItems || totalAmount || 0);
  const tax = normalizeTaxBreakup(p.tax, baseAmount, totalAmount || baseAmount);
  const computedTotal = Math.max(0, totalAmount || baseAmount + (tax.gstAmount || 0));
  if (!tax.taxableValue) tax.taxableValue = baseAmount;
  return { baseAmount, tax, totalAmount: computedTotal };
}
function normalizeRestaurantKey(v) {
  return String(v || "").trim();
}
function normalizeVendorMenuPayload(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      return normalizeVendorMenuPayload(JSON.parse(v));
    } catch {
      return [];
    }
  }
  if (v && typeof v === "object") {
    const obj = v;
    if (Array.isArray(obj.menu)) return obj.menu;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.dishes)) return obj.dishes;
  }
  return [];
}
function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || "").trim()).filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[") || t.startsWith("{")) {
      const parsed = safeJsonParseObject(t);
      return normalizeStringList(parsed);
    }
    return t.split(",").map((x) => x.trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value).map((x) => String(x || "").trim()).filter(Boolean);
  }
  return [];
}
function normalizeHotelRoomTypes(value, basePrice) {
  const arr = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  const mapped = arr.map((rt) => ({
    type: String(rt?.type || rt?.name || "Standard Room"),
    price: Math.max(0, Number(rt?.price ?? rt?.amount ?? basePrice ?? 0) || 0),
    capacity: Math.max(1, Number(rt?.capacity ?? rt?.guests ?? rt?.occupancy ?? 2) || 2)
  }));
  if (mapped.length > 0) return mapped;
  return [{
    type: "Standard Room",
    price: Math.max(0, Number(basePrice || 0)),
    capacity: 2
  }];
}
function normalizeSeasonalPricing(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value === "object" && Object.keys(value).length === 0) return [];
  return [];
}
async function loadSupabaseDatabase() {
  const [
    settingsRows,
    policiesRows,
    paymentsRows,
    tours,
    festivals,
    hotels,
    foodVendors,
    legacyRestaurants,
    foodMenuItems,
    legacyMenuItems,
    bookings,
    cabBookings,
    busRoutes,
    busBookings,
    bikeRentals,
    bikeBookings,
    foodOrders,
    foodCarts,
    martCarts,
    queries,
    auditLog,
    cabProviders,
    cabRates,
    driverRegistrationRequests,
    drivers,
    driverVehicles,
    driverDocuments,
    driverAvailability,
    driverBids,
    rideAssignments,
    serviceAreas,
    coupons,
    foodVendorMenus,
    legacyVendorMenus,
    sitePagesRows,
    userProfilesRows,
    userBehaviorRows,
    analyticsEventRows
  ] = await Promise.all([
    supabaseSelect("ev_settings", "id=eq.main&select=*"),
    supabaseSelect("ev_policies", "id=eq.main&select=*"),
    supabaseSelect("ev_payments", "id=eq.main&select=*"),
    supabaseSelectAll("ev_tours"),
    supabaseSelectAll("ev_festivals"),
    supabaseSelectAll("ev_hotels"),
    supabaseSelectAllIfExists(FOOD_VENDOR_TABLE),
    supabaseSelectAll(LEGACY_FOOD_VENDOR_TABLE),
    supabaseSelectAllIfExists(FOOD_MENU_ITEM_TABLE),
    supabaseSelectAll(LEGACY_FOOD_MENU_ITEM_TABLE),
    supabaseSelectAll("ev_bookings"),
    supabaseSelectAll("ev_cab_bookings"),
    supabaseSelectAllIfExists("ev_buses"),
    supabaseSelectAllIfExists("ev_bus_bookings"),
    supabaseSelectAllIfExists("ev_bike_rentals"),
    supabaseSelectAllIfExists("ev_bike_bookings"),
    supabaseSelectAll("ev_food_orders"),
    supabaseSelectAllIfExists("ev_food_carts"),
    supabaseSelectAllIfExists("ev_mart_carts"),
    supabaseSelectAll("ev_queries"),
    supabaseSelectAll("ev_audit_log"),
    supabaseSelectAllIfExists("ev_cab_providers"),
    supabaseSelectAllIfExists("ev_cab_rates"),
    supabaseSelectAllIfExists("ev_driver_registration_requests"),
    supabaseSelectAllIfExists("ev_drivers"),
    supabaseSelectAllIfExists("ev_driver_vehicles"),
    supabaseSelectAllIfExists("ev_driver_documents"),
    supabaseSelectAllIfExists("ev_driver_availability"),
    supabaseSelectAllIfExists("ev_cab_bids"),
    supabaseSelectAllIfExists("ev_ride_assignments"),
    supabaseSelectAllIfExists("ev_service_areas"),
    supabaseSelectAll("ev_coupons", 1e3, "code"),
    supabaseSelectAllIfExists(FOOD_VENDOR_MENU_TABLE, 1e3, "restaurant_id"),
    supabaseSelectAllIfExists(LEGACY_FOOD_VENDOR_MENU_TABLE, 1e3, "restaurant_id"),
    supabaseSelectAllIfExists("ev_site_pages", 1e3, "slug"),
    supabaseSelectAllIfExists(supabaseUserProfileTable(), 1e3, "id"),
    supabaseSelectAllIfExists("ev_user_behavior_profiles", 1e3, "id"),
    supabaseSelectAllIfExists("ev_analytics_events", 1e3, "at")
  ]);
  const restaurants = foodVendors.length ? foodVendors : legacyRestaurants;
  const menuItems = foodMenuItems.length ? foodMenuItems : legacyMenuItems;
  const vendorMenus = foodVendorMenus.length ? foodVendorMenus : legacyVendorMenus;
  const settings = settingsRows[0] ? {
    currency: settingsRows[0].currency || "INR",
    pageSlugs: {
      ...DEFAULT_SETTINGS.pageSlugs,
      ...settingsRows[0].page_slugs && typeof settingsRows[0].page_slugs === "object" ? settingsRows[0].page_slugs : {}
    },
    taxRules: {
      ...DEFAULT_SETTINGS.taxRules,
      ...settingsRows[0].tax_rules && typeof settingsRows[0].tax_rules === "object" ? settingsRows[0].tax_rules : {},
      invoice: {
        ...DEFAULT_SETTINGS.taxRules.invoice,
        ...(settingsRows[0].tax_rules && typeof settingsRows[0].tax_rules === "object" ? settingsRows[0].tax_rules.invoice : {}) || {}
      }
    },
    pricingTiers: settingsRows[0].pricing_tiers || []
  } : DEFAULT_SETTINGS;
  const policyRow = policiesRows[0] || {};
  const paymentsRow = paymentsRows[0] || {};
  const mergedPolicies = {
    hotel: {
      freeCancelHours: Number(policyRow?.hotel?.freeCancelHours ?? DEFAULT_POLICIES.hotel.freeCancelHours),
      feeAfter: Number(policyRow?.hotel?.feeAfter ?? DEFAULT_POLICIES.hotel.feeAfter)
    },
    tour: {
      freeCancelHours: Number(policyRow?.tour?.freeCancelHours ?? DEFAULT_POLICIES.tour.freeCancelHours),
      feeAfter: Number(policyRow?.tour?.feeAfter ?? DEFAULT_POLICIES.tour.feeAfter)
    },
    cab: {
      freeCancelMinutes: Number(policyRow?.cab?.freeCancelMinutes ?? DEFAULT_POLICIES.cab.freeCancelMinutes),
      feeAfter: Number(policyRow?.cab?.feeAfter ?? DEFAULT_POLICIES.cab.feeAfter)
    },
    food: {
      allowCancelMinutes: Number(policyRow?.food?.allowCancelMinutes ?? DEFAULT_POLICIES.food.allowCancelMinutes),
      feeAfter: Number(policyRow?.food?.feeAfter ?? DEFAULT_POLICIES.food.feeAfter)
    }
  };
  const mergedPayments = {
    walletEnabled: Boolean(paymentsRow?.wallet_enabled ?? DEFAULT_PAYMENTS.walletEnabled),
    refundMethod: String(paymentsRow?.refund_method || DEFAULT_PAYMENTS.refundMethod),
    refundWindowHours: Number(paymentsRow?.refund_window_hours ?? DEFAULT_PAYMENTS.refundWindowHours)
  };
  const vendorMenuByRestaurant = (vendorMenus || []).reduce((acc, x) => {
    const rid = normalizeRestaurantKey(x.restaurant_id);
    if (!rid) return acc;
    acc[rid] = normalizeVendorMenuPayload(x.menu);
    return acc;
  }, {});
  const vendorMenuImageByRestaurant = Object.entries(vendorMenuByRestaurant).reduce((acc, [rid, rows]) => {
    const byId = /* @__PURE__ */ new Map();
    const byKey = /* @__PURE__ */ new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const image = safeText3(row?.image || row?.hero_image || "");
      if (!image) return;
      const id = safeText3(row?.id || "");
      const key = normalizeMenuLookupKey(row?.name, row?.category);
      if (id && !byId.has(id)) byId.set(id, image);
      if (key && !byKey.has(key)) byKey.set(key, image);
    });
    acc[rid] = { byId, byKey };
    return acc;
  }, {});
  const menuByRestaurant = (menuItems || []).reduce((acc, m) => {
    const rid = normalizeRestaurantKey(m.restaurant_id);
    if (!rid) return acc;
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push({
      id: String(m.id || ""),
      name: String(m.name || ""),
      category: String(m.category || "General"),
      description: String(m.description || ""),
      image: String(m.image || m.hero_image || ""),
      price: Number(m.price || 0),
      rating: 0,
      maxOrders: Number(m.max_per_order || 10),
      addons: Array.isArray(m.addons) ? m.addons : []
    });
    return acc;
  }, {});
  const sitePagesMap = (sitePagesRows || []).reduce((acc, row) => {
    const slug = String(row?.slug || "").trim();
    if (!slug) return acc;
    acc[slug] = {
      title: String(row?.title || slug),
      slug,
      content: String(row?.content || ""),
      updatedAt: nullableText(row?.updated_at)
    };
    return acc;
  }, {});
  const slugs = settings?.pageSlugs || DEFAULT_SETTINGS.pageSlugs;
  const pickPage = (key, fallback) => {
    const slug = String(slugs && slugs[key] || fallback.slug || "");
    const hit = slug ? sitePagesMap[slug] : null;
    if (hit) return hit;
    return { ...fallback, slug };
  };
  const sitePages = {
    affiliateProgram: pickPage("affiliateProgram", DEFAULT_SITE_PAGES.affiliateProgram),
    contactUs: pickPage("contactUs", DEFAULT_SITE_PAGES.contactUs),
    privacyPolicy: pickPage("privacyPolicy", DEFAULT_SITE_PAGES.privacyPolicy),
    refundPolicy: pickPage("refundPolicy", DEFAULT_SITE_PAGES.refundPolicy),
    termsAndConditions: pickPage("termsAndConditions", DEFAULT_SITE_PAGES.termsAndConditions)
  };
  const dbCandidate = {
    settings,
    tours: tours.map((x) => ({
      id: x.id,
      title: x.title,
      description: x.description,
      price: Number(x.price || 0),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      duration: x.duration,
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: x.image_meta && x.image_meta.length ? x.image_meta : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      itinerary: x.itinerary || "",
      mapEmbedUrl: String(x.map_embed_url || ""),
      faqs: x.faqs || [],
      itineraryItems: x.itinerary_items || [],
      facts: x.facts || [],
      contentBlocks: x.content_blocks || {},
      i18n: x.i18n || {},
      inclusions: x.inclusions || [],
      exclusions: x.exclusions || [],
      maxGuests: Number(x.max_guests || 1),
      availability: x.availability || { closedDates: [], capacityByDate: {} },
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    festivals: festivals.map((x) => ({
      id: x.id,
      title: x.title,
      description: x.description || "",
      location: x.location || "",
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      month: x.month || "All Season",
      date: nullableText(x.date),
      vibe: x.vibe || "",
      ticket: x.ticket || "On request",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: x.image_meta && x.image_meta.length ? x.image_meta : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      available: x.available !== false,
      createdAt: nullableText(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    hotels: hotels.map((x) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      location: x.location,
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      pricePerNight: Number(x.price_per_night || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: x.image_meta && x.image_meta.length ? x.image_meta : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      amenities: normalizeStringList(x.amenities),
      privateSpaces: normalizeStringList(x.private_spaces),
      sharedSpaces: x.shared_spaces ?? [],
      roomAmenities: normalizeStringList(x.room_amenities),
      popularWithGuests: normalizeStringList(x.popular_with_guests),
      roomFeatures: normalizeStringList(x.room_features),
      basicFacilities: normalizeStringList(x.basic_facilities),
      bedsAndBlanket: normalizeStringList(x.beds_and_blanket),
      foodAndDrinks: normalizeStringList(x.food_and_drinks),
      safetyAndSecurity: normalizeStringList(x.safety_and_security),
      mediaAndEntertainment: normalizeStringList(x.media_and_entertainment),
      bathroom: normalizeStringList(x.bathroom),
      otherFacilities: normalizeStringList(x.other_facilities),
      inclusion: x.inclusion ?? [],
      exclusion: x.exclusion ?? [],
      roomTypes: normalizeHotelRoomTypes(x.room_types, Number(x.price_per_night || 0)),
      rating: Number(x.rating || 0),
      reviews: Number(x.reviews || 0),
      checkInTime: x.check_in_time || "14:00",
      checkOutTime: x.check_out_time || "11:00",
      availability: x.availability || { closedDates: [], roomsByType: {} },
      seasonalPricing: normalizeSeasonalPricing(x.seasonal_pricing),
      dateOverrides: x.date_overrides || {},
      minNights: Number(x.min_nights || 1),
      maxNights: Number(x.max_nights || 30),
      childPolicy: x.child_policy || "",
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    restaurants: restaurants.map((x) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      gstin: String(x.gstin || x.gst_number || x.gstNumber || x.gst_no || ""),
      username: String(x.username || ""),
      passwordHash: String(x.password_hash || ""),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      cuisine: x.cuisine || [],
      rating: Number(x.rating || 0),
      reviewCount: Number(x.review_count || 0),
      deliveryTime: x.delivery_time || "",
      minimumOrder: Number(x.minimum_order || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: x.image_meta && x.image_meta.length ? x.image_meta : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      available: x.available !== false,
      isVeg: !!x.is_veg,
      tags: x.tags || [],
      location: x.location || "",
      serviceRadiusKm: Number(x.service_radius_km || 0),
      deliveryZones: x.delivery_zones || [],
      openHours: x.open_hours || "09:00",
      closingHours: x.closing_hours || "22:00",
      menu: (() => {
        const rid = normalizeRestaurantKey(x.id);
        const directVendorMenu = normalizeVendorMenuPayload(vendorMenuByRestaurant[rid]);
        const tableMenu = normalizeVendorMenuPayload(x.menu);
        const fallbackMenu = normalizeVendorMenuPayload(menuByRestaurant[rid] || []);
        const chosen = directVendorMenu.length ? directVendorMenu : tableMenu.length ? tableMenu : fallbackMenu;
        return chosen.map((m, i) => ({
          id: String(m?.id || `${x.id}_menu_${i + 1}`),
          name: String(m?.name || ""),
          category: String(m?.category || "General"),
          description: String(m?.description || ""),
          image: String(m?.image || ""),
          price: Number(m?.price || 0),
          rating: Number(m?.rating || 0),
          maxOrders: Number(m?.maxOrders || 10),
          addons: Array.isArray(m?.addons) ? m.addons : []
        }));
      })()
    })),
    menuItems: menuItems.map((x) => {
      const restaurantId = normalizeRestaurantKey(x.restaurant_id);
      const imageFallbacks = vendorMenuImageByRestaurant[restaurantId] || { byId: /* @__PURE__ */ new Map(), byKey: /* @__PURE__ */ new Map() };
      const fallbackImage = imageFallbacks.byId.get(safeText3(x.id || "")) || imageFallbacks.byKey.get(normalizeMenuLookupKey(x.name, x.category)) || "";
      const resolvedImage = nullableText(x.image || x.hero_image || fallbackImage);
      return {
        id: x.id,
        restaurantId: x.restaurant_id,
        category: x.category,
        name: x.name,
        description: x.description || "",
        price: Number(x.price || 0),
        mrp: Math.max(0, Number(x.mrp || 0) || 0),
        priceDropped: x.price_dropped === true,
        priceDropPercent: Number(x.price_drop_percent || 0),
        heroImage: nullableText(x.hero_image || x.image || fallbackImage),
        image: resolvedImage,
        imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
        imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
        imageMeta: x.image_meta && x.image_meta.length ? x.image_meta : buildImageMeta(resolvedImage ? [resolvedImage] : [], x.image_titles || [], x.image_descriptions || []),
        available: x.available !== false,
        isVeg: !!x.is_veg,
        tags: x.tags || [],
        stock: Number(x.stock || 0),
        maxPerOrder: Number(x.max_per_order || 10),
        addons: x.addons || [],
        variants: x.variants || []
      };
    }),
    bookings: bookings.map((x) => ({
      id: x.id,
      type: x.type,
      itemId: x.item_id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      aadhaarUrl: nullableText(x.aadhaar_url) || "",
      countryCode: nullableText(x.country_code) || "",
      paidAmount: x.paid_amount === void 0 || x.paid_amount === null ? void 0 : Number(x.paid_amount),
      razorpayPaymentId: nullableText(x.razorpay_payment_id) || "",
      razorpayOrderId: nullableText(x.razorpay_order_id) || "",
      guests: Number(x.guests || 1),
      checkIn: nullableText(x.check_in),
      checkOut: nullableText(x.check_out),
      roomType: nullableText(x.room_type),
      numRooms: Number(x.num_rooms || 1),
      tourDate: nullableText(x.tour_date),
      specialRequests: x.special_requests || "",
      pricing: x.pricing || {},
      status: x.status || "pending",
      bookingDate: toIsoStringOrNow(x.booking_date)
    })),
    cabBookings: cabBookings.map((x) => ({
      id: x.id,
      userName: x.user_name,
      email: String(x.email || ""),
      phone: x.phone,
      pickupLocation: x.pickup_location,
      dropLocation: x.drop_location,
      datetime: x.datetime,
      passengers: Number(x.passengers || 1),
      vehicleType: x.vehicle_type,
      estimatedFare: Number(x.estimated_fare || 0),
      // Absent until add_cab_quote_fields.sql has been applied.
      bookingMode: String(x.booking_mode || "") === "quotes" ? "quotes" : "union",
      quotedFare: Number(x.quoted_fare || 0),
      quotedAt: nullableText(x.quoted_at) || "",
      quotedBy: String(x.quoted_by || ""),
      // "cancelled" belongs here too: cancelling a ride closes any open quote,
      // and without it the state would read back as "" and lose the reason the
      // quote is no longer acceptable.
      quoteStatus: ["quoted", "accepted", "declined", "cancelled"].includes(String(x.quote_status || "")) ? String(x.quote_status) : "",
      serviceAreaId: nullableText(x.service_area_id),
      selectedBidId: String(x.selected_bid_id || ""),
      assignedDriverId: String(x.assigned_driver_id || ""),
      paymentStatus: String(x.payment_status || ""),
      paymentRequired: x.payment_required === true,
      paymentDueAmount: Number(x.payment_due_amount || 0),
      paymentBidId: String(x.payment_bid_id || ""),
      paymentOrderId: String(x.payment_order_id || ""),
      paymentOrderAmount: Number(x.payment_order_amount || 0),
      paymentCurrency: String(x.payment_currency || ""),
      paymentPaidAt: nullableText(x.payment_paid_at),
      paymentId: String(x.payment_id || ""),
      paymentSignature: String(x.payment_signature || ""),
      rideOtp: String(x.ride_otp || ""),
      rideOtpIssuedAt: nullableText(x.ride_otp_issued_at),
      rideOtpStatus: ["pending", "verified", "not_required"].includes(String(x.ride_otp_status || "").trim().toLowerCase()) ? String(x.ride_otp_status || "").trim().toLowerCase() : "not_required",
      rideOtpVerifiedAt: nullableText(x.ride_otp_verified_at),
      rideOtpVerifiedBy: String(x.ride_otp_verified_by || ""),
      pickupUpdatedAt: nullableText(x.pickup_updated_at),
      pickupUpdatedBy: String(x.pickup_updated_by || ""),
      fineAmount: Number(x.fine_amount || 0),
      fineStatus: String(x.fine_status || "none"),
      fineReason: String(x.fine_reason || ""),
      noShowReportedBy: String(x.no_show_reported_by || ""),
      noShowReportedAt: nullableText(x.no_show_reported_at),
      pricing: x.pricing || {},
      status: x.status || "pending",
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    busRoutes: busRoutes.map((x) => ({
      id: String(x.id || ""),
      operatorName: String(x.operator_name || ""),
      operatorCode: String(x.operator_code || ""),
      fromCity: String(x.from_city || ""),
      fromCode: String(x.from_code || ""),
      toCity: String(x.to_city || ""),
      toCode: String(x.to_code || ""),
      departureTime: String(x.departure_time || ""),
      arrivalTime: String(x.arrival_time || ""),
      durationText: String(x.duration_text || ""),
      busType: String(x.bus_type || "Non AC"),
      fare: Number(x.fare || 0),
      totalSeats: Number(x.total_seats || 20),
      seatLayout: Array.isArray(x.seat_layout) ? x.seat_layout : [],
      serviceDates: Array.isArray(x.service_dates) ? x.service_dates : [],
      seatsBookedByDate: x.seats_booked_by_date && typeof x.seats_booked_by_date === "object" ? x.seats_booked_by_date : {},
      heroImage: String(x.hero_image || ""),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    busBookings: busBookings.map((x) => ({
      id: String(x.id || ""),
      routeId: String(x.route_id || ""),
      userName: String(x.user_name || ""),
      email: String(x.email || ""),
      phone: String(x.phone || ""),
      fromCity: String(x.from_city || ""),
      toCity: String(x.to_city || ""),
      travelDate: String(x.travel_date || ""),
      seats: Array.isArray(x.seats) ? x.seats.map((s) => String(s || "")) : [],
      farePerSeat: Number(x.fare_per_seat || 0),
      totalFare: Number(x.total_fare || 0),
      status: String(x.status || "pending"),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    bikeRentals: bikeRentals.map((x) => ({
      id: String(x.id || ""),
      name: String(x.name || ""),
      location: String(x.location || ""),
      bikeType: String(x.bike_type || "Scooter"),
      pricePerHour: Number(x.price_per_hour || 0),
      pricePerDay: Number(x.price_per_day || 0),
      availableQty: Number(x.available_qty || 0),
      securityDeposit: Number(x.security_deposit || 0),
      helmetIncluded: x.helmet_included !== false,
      vendorMobile: String(x.vendor_mobile || ""),
      image: String(x.image || ""),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    bikeBookings: bikeBookings.map((x) => ({
      id: String(x.id || ""),
      bikeRentalId: String(x.bike_rental_id || ""),
      userName: String(x.user_name || ""),
      email: String(x.email || ""),
      phone: String(x.phone || ""),
      startDateTime: String(x.start_datetime || ""),
      hours: Number(x.hours || 1),
      qty: Number(x.qty || 1),
      totalFare: Number(x.total_fare || 0),
      status: String(x.status || "pending"),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    foodOrders: foodOrders.map((x) => ({
      id: x.id,
      userId: String(x.user_id || ""),
      restaurantId: String(x.restaurant_id || ""),
      userName: x.user_name,
      email: String(x.email || ""),
      phone: x.phone,
      items: (() => {
        const rid = String(x.restaurant_id || "");
        return normalizeFoodOrderItems(x.items, rid);
      })(),
      deliveryAddress: x.delivery_address,
      deliveryPincode: String(x.delivery_pincode || ""),
      deliveryAddressId: String(x.delivery_address_id || ""),
      deliveryRegion: String(x.delivery_region || ""),
      specialInstructions: x.special_instructions || "",
      pricing: (() => {
        const rid = String(x.restaurant_id || "");
        const itemsNorm = normalizeFoodOrderItems(x.items, rid);
        return normalizeFoodPricing(x.pricing || {}, itemsNorm);
      })(),
      status: x.status || "pending",
      orderTime: toIsoStringOrNow(x.order_time)
    })),
    queries: queries.map((x) => ({
      id: x.id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      subject: x.subject,
      message: x.message,
      // Absent until add_query_order_link.sql has been applied; older rows are
      // general enquiries, which is what these defaults describe.
      orderId: x.order_id || "",
      orderType: x.order_type || "",
      source: x.source || "contact_page",
      status: x.status || "pending",
      submittedAt: toIsoStringOrNow(x.submitted_at),
      respondedAt: x.responded_at || null,
      response: x.response || null
    })),
    auditLog: auditLog.map((x) => ({
      id: x.id,
      at: toIsoStringOrNow(x.at),
      adminChatId: x.admin_chat_id ?? void 0,
      action: x.action,
      entity: nullableText(x.entity),
      entityId: nullableText(x.entity_id),
      meta: x.meta || {}
    })),
    cabProviders: cabProviders.map((x) => ({
      id: x.id,
      name: x.name,
      vehicleType: x.vehicle_type,
      plateNumber: x.plate_number,
      capacity: Number(x.capacity || 1),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      active: x.active !== false,
      serviceAreaId: nullableText(x.service_area_id)
    })),
    cabRates: cabRates.map((x) => ({
      id: nullableText(x.id),
      origin: String(x.origin || ""),
      destination: String(x.destination || ""),
      routeLabel: String(x.route_label || ""),
      ordinary4_1: x.ordinary_4_1 === null || x.ordinary_4_1 === void 0 ? void 0 : Number(x.ordinary_4_1),
      luxury4_1: x.luxury_4_1 === null || x.luxury_4_1 === void 0 ? void 0 : Number(x.luxury_4_1),
      ordinary6_1: x.ordinary_6_1 === null || x.ordinary_6_1 === void 0 ? void 0 : Number(x.ordinary_6_1),
      luxury6_1: x.luxury_6_1 === null || x.luxury_6_1 === void 0 ? void 0 : Number(x.luxury_6_1),
      traveller: x.traveller === null || x.traveller === void 0 ? void 0 : Number(x.traveller)
    })),
    driverRegistrationRequests: driverRegistrationRequests.map((x) => ({
      id: String(x.id || ""),
      name: String(x.name || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      vehicleType: String(x.vehicle_type || ""),
      vehicleNumber: String(x.vehicle_number || ""),
      licenseNumber: String(x.license_number || ""),
      idProofUrl: String(x.id_proof_url || ""),
      notes: String(x.notes || ""),
      status: String(x.status || "pending"),
      reviewedBy: String(x.reviewed_by || ""),
      reviewedAt: x.reviewed_at ? toIsoStringOrNow(x.reviewed_at) : "",
      rejectionReason: String(x.rejection_reason || ""),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    drivers: drivers.map((x) => ({
      id: String(x.id || ""),
      registrationRequestId: String(x.registration_request_id || ""),
      name: String(x.name || ""),
      username: String(x.username || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      passwordHash: String(x.password_hash || ""),
      status: String(x.status || "pending"),
      rating: Number(x.rating || 4.5),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    driverVehicles: driverVehicles.map((x) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      vehicleType: String(x.viechle_cat || x.vehicle_type || ""),
      viechle_cat: String(x.viechle_cat || x.vehicle_type || ""),
      vehicleNumber: String(x.vehicle_number || ""),
      color: String(x.color || ""),
      model: String(x.model || ""),
      seats: Number(x.seats || 4),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    driverDocuments: driverDocuments.map((x) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      registrationRequestId: String(x.registration_request_id || ""),
      kind: String(x.kind || "other"),
      url: String(x.url || ""),
      label: String(x.label || ""),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    driverAvailability: driverAvailability.map((x) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      online: x.online === true,
      lat: x.lat === null || x.lat === void 0 ? void 0 : Number(x.lat),
      lng: x.lng === null || x.lng === void 0 ? void 0 : Number(x.lng),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    driverBids: driverBids.map((x) => ({
      id: String(x.id || ""),
      rideRequestId: String(x.ride_request_id || ""),
      driverId: String(x.driver_id || ""),
      bidPrice: Number(x.bid_price || 0),
      etaMin: Number(x.eta_min || 0),
      status: String(x.status || "active"),
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    rideAssignments: rideAssignments.map((x) => ({
      id: String(x.id || ""),
      rideRequestId: String(x.ride_request_id || ""),
      driverId: String(x.driver_id || ""),
      bidId: String(x.bid_id || ""),
      status: String(x.status || "assigned"),
      assignedAt: toIsoStringOrNow(x.assigned_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    serviceAreas: serviceAreas.map((x) => ({
      id: x.id,
      name: x.name,
      city: x.city,
      enabled: x.enabled !== false
    })),
    coupons: coupons.map((x) => ({
      code: x.code,
      type: x.type,
      amount: Number(x.amount || 0),
      minCart: Number(x.min_cart || 0),
      category: x.category || "all",
      expiry: x.expiry,
      maxUses: x.max_uses ?? void 0
    })),
    userProfiles: userProfilesRows.map((x) => ({
      id: String(x.id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      address: String(x.address || ""),
      city: String(x.city || ""),
      state: String(x.state || ""),
      pincode: String(x.pincode || ""),
      landmark: String(x.landmark || ""),
      defaultAddressId: String(x.default_address_id || ""),
      ipAddress: String(x.ip_address || ""),
      browser: String(x.browser || ""),
      password: String(x.password || ""),
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at),
      orders: Array.isArray(x.orders) ? x.orders : [],
      // The counterpart of the write mapping: without this a stored
      // notification would be read back as absent and the next profile write
      // would erase it.
      pushNotifications: Array.isArray(x.push_notifications) ? x.push_notifications : []
    })),
    userBehaviorProfiles: userBehaviorRows.map((x) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      coreIdentity: x.core_identity || {},
      deviceFingerprinting: x.device_fingerprinting || {},
      locationMobility: x.location_mobility || {},
      behavioralAnalytics: x.behavioral_analytics || {},
      transactionPayment: x.transaction_payment || {},
      preferencePersonalization: x.preference_personalization || {},
      ratingsReviewsFeedback: x.ratings_reviews_feedback || {},
      marketingAttribution: x.marketing_attribution || {},
      trustSafetyFraud: x.trust_safety_fraud || {},
      derivedInferred: x.derived_inferred || {},
      orders: Array.isArray(x.orders) ? x.orders : [],
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    carts: (foodCarts || []).map((x) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      restaurantId: String(x.restaurant_id || ""),
      items: Array.isArray(x.items) ? x.items : [],
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    martCarts: (martCarts || []).map((x) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      userName: String(x.user_name || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      deliveryAddress: String(x.delivery_address || ""),
      items: Array.isArray(x.items) ? x.items : [],
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    analyticsEvents: analyticsEventRows.map((x) => ({
      id: String(x.id || ""),
      type: String(x.type || ""),
      category: String(x.category || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      at: toIsoStringOrNow(x.at),
      meta: x.meta || {}
    })),
    policies: mergedPolicies,
    payments: mergedPayments,
    sitePages
  };
  syncUserProfilesFromOrders(dbCandidate);
  syncUserBehaviorProfilesFromData(dbCandidate);
  return DatabaseSchema.parse(dbCandidate);
}
async function writeSupabaseDatabase(db) {
  invalidateDatabaseCache();
  await supabaseUpsertWithOptionalPriceFields("ev_settings", [{
    id: "main",
    currency: db.settings.currency,
    page_slugs: db.settings.pageSlugs || DEFAULT_SETTINGS.pageSlugs,
    tax_rules: db.settings.taxRules || {},
    pricing_tiers: db.settings.pricingTiers || []
  }]);
  await supabaseUpsert("ev_policies", [{
    id: "main",
    hotel: db.policies?.hotel || {},
    tour: db.policies?.tour || {},
    cab: db.policies?.cab || {},
    food: db.policies?.food || {}
  }]);
  await supabaseUpsert("ev_payments", [{
    id: "main",
    wallet_enabled: !!db.payments?.walletEnabled,
    refund_method: db.payments?.refundMethod || "original",
    refund_window_hours: Number(db.payments?.refundWindowHours || 72)
  }]);
  if (db.tours.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_tours", db.tours.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload(x.images, x.imageTitles, x.imageDescriptions, x.imageMeta);
        return {
          id: x.id,
          title: x.title,
          description: x.description,
          price: x.price,
          vendor_mobile: x.vendorMobile || "",
          additional_comments: x.additionalComments || "",
          price_dropped: x.priceDropped === true,
          price_drop_percent: Number(x.priceDropPercent || 0),
          hero_image: x.heroImage || "",
          duration: x.duration,
          images: n.images,
          image_titles: n.imageTitles,
          image_descriptions: n.imageDescriptions,
          image_meta: n.imageMeta
        };
      })(),
      highlights: x.highlights || [],
      itinerary: x.itinerary || "",
      inclusions: x.inclusions || [],
      exclusions: x.exclusions || [],
      map_embed_url: String(x.mapEmbedUrl || ""),
      faqs: x.faqs || [],
      itinerary_items: x.itineraryItems || [],
      facts: x.facts || [],
      content_blocks: x.contentBlocks || {},
      i18n: x.i18n || {},
      max_guests: x.maxGuests,
      availability: x.availability || {},
      available: x.available !== false,
      created_at: x.createdAt || null,
      updated_at: x.updatedAt || null
    })));
  }
  if (db.festivals.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_festivals", db.festivals.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload(x.images, x.imageTitles, x.imageDescriptions, x.imageMeta);
        return {
          id: x.id,
          title: x.title,
          description: x.description || "",
          location: x.location || "",
          vendor_mobile: x.vendorMobile || "",
          additional_comments: x.additionalComments || "",
          price_dropped: x.priceDropped === true,
          price_drop_percent: Number(x.priceDropPercent || 0),
          hero_image: x.heroImage || "",
          month: x.month || "All Season",
          images: n.images,
          image_titles: n.imageTitles,
          image_descriptions: n.imageDescriptions,
          image_meta: n.imageMeta
        };
      })(),
      date: x.date || null,
      vibe: x.vibe || "",
      ticket: String(x.ticket ?? "On request"),
      highlights: x.highlights || [],
      available: x.available !== false,
      created_at: x.createdAt || null,
      updated_at: x.updatedAt || null
    })));
  }
  if (db.hotels.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_hotels", db.hotels.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload(x.images, x.imageTitles, x.imageDescriptions, x.imageMeta);
        return {
          id: x.id,
          name: x.name,
          description: x.description,
          location: x.location,
          vendor_mobile: x.vendorMobile || "",
          additional_comments: x.additionalComments || "",
          price_per_night: x.pricePerNight,
          price_dropped: x.priceDropped === true,
          price_drop_percent: Number(x.priceDropPercent || 0),
          hero_image: x.heroImage || "",
          images: n.images,
          image_titles: n.imageTitles,
          image_descriptions: n.imageDescriptions,
          image_meta: n.imageMeta
        };
      })(),
      amenities: x.amenities || [],
      room_types: x.roomTypes || [],
      rating: x.rating || 0,
      reviews: x.reviews || 0,
      private_spaces: x.privateSpaces || [],
      shared_spaces: x.sharedSpaces || [],
      room_amenities: x.roomAmenities || [],
      popular_with_guests: x.popularWithGuests || [],
      room_features: x.roomFeatures || [],
      basic_facilities: x.basicFacilities || [],
      beds_and_blanket: x.bedsAndBlanket || [],
      food_and_drinks: x.foodAndDrinks || [],
      safety_and_security: x.safetyAndSecurity || [],
      media_and_entertainment: x.mediaAndEntertainment || [],
      bathroom: x.bathroom || [],
      other_facilities: x.otherFacilities || [],
      inclusion: x.inclusion || [],
      exclusion: x.exclusion || [],
      check_in_time: x.checkInTime || "14:00",
      check_out_time: x.checkOutTime || "11:00",
      availability: x.availability || {},
      seasonal_pricing: x.seasonalPricing || [],
      date_overrides: x.dateOverrides || {},
      min_nights: x.minNights || 1,
      max_nights: x.maxNights || 30,
      child_policy: x.childPolicy || "",
      available: x.available !== false,
      created_at: x.createdAt || null
    })));
  }
  if (db.restaurants.length) {
    const vendorRows = db.restaurants.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload(x.images, x.imageTitles, x.imageDescriptions, x.imageMeta);
        return {
          id: x.id,
          name: x.name,
          description: x.description,
          username: x.username || "",
          password_hash: x.passwordHash || "",
          vendor_mobile: x.vendorMobile || "",
          additional_comments: x.additionalComments || "",
          cuisine: x.cuisine || [],
          rating: x.rating || 0,
          review_count: x.reviewCount || 0,
          delivery_time: x.deliveryTime || "",
          minimum_order: x.minimumOrder || 0,
          price_dropped: x.priceDropped === true,
          price_drop_percent: Number(x.priceDropPercent || 0),
          hero_image: x.heroImage || "",
          images: n.images,
          image_titles: n.imageTitles,
          image_descriptions: n.imageDescriptions,
          image_meta: n.imageMeta,
          available: x.available !== false
        };
      })(),
      is_veg: !!x.isVeg,
      tags: x.tags || [],
      location: x.location || "",
      service_radius_km: x.serviceRadiusKm || 0,
      delivery_zones: x.deliveryZones || [],
      open_hours: x.openHours || "09:00",
      closing_hours: x.closingHours || "22:00",
      menu: x.menu || []
    }));
    try {
      await supabaseUpsertWithOptionalPriceFields(FOOD_VENDOR_TABLE, vendorRows);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      await supabaseUpsertWithOptionalPriceFields(LEGACY_FOOD_VENDOR_TABLE, vendorRows);
    }
  }
  if (db.restaurants.length) {
    try {
      await supabaseUpsert(FOOD_VENDOR_MENU_TABLE, db.restaurants.map((x) => ({
        restaurant_id: x.id,
        menu: x.menu || [],
        updated_at: nowISO()
      })), "restaurant_id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      try {
        await supabaseUpsert(LEGACY_FOOD_VENDOR_MENU_TABLE, db.restaurants.map((x) => ({
          restaurant_id: x.id,
          menu: x.menu || [],
          updated_at: nowISO()
        })), "restaurant_id");
      } catch (legacyErr) {
        if (!isMissingTableError(legacyErr)) throw legacyErr;
      }
    }
  }
  const existingMenuById = new Map((db.menuItems || []).map((mi) => [String(mi.id || ""), mi]));
  const existingMenuByRestaurantAndName = new Map(
    (db.menuItems || []).map((mi) => [`${String(mi.restaurantId || "").trim()}::${String(mi.name || "").trim().toLowerCase()}`, mi])
  );
  const menuItemsFromVendors = (db.restaurants || []).flatMap((r) => {
    const items = Array.isArray(r?.menu) ? r.menu : [];
    return items.map((m, idx) => {
      const id = String(m?.id || `${r.id}_menu_${idx + 1}`);
      const nameKey = `${String(r.id || "").trim()}::${String(m?.name || "").trim().toLowerCase()}`;
      const existing = existingMenuById.get(id) || existingMenuByRestaurantAndName.get(nameKey);
      return {
        id,
        restaurantId: r.id,
        category: String(m?.category || "General"),
        name: String(m?.name || ""),
        description: String(m?.description || ""),
        price: Number(m?.price || 0),
        // The MRP is what the customer is charged, so a menu blob that carries
        // none must not persist a 0 - the app would then quote the vendor price.
        mrp: resolveStoredMenuMrp(m?.mrp ?? existing?.mrp, m?.price),
        heroImage: String(m?.image || ""),
        image: String(m?.image || ""),
        available: existing ? existing.available !== false : true,
        isVeg: existing ? !!existing.isVeg : false,
        tags: Array.isArray(existing?.tags) ? existing.tags : [],
        stock: (() => {
          const incoming = Number(m?.stock);
          if (Number.isFinite(incoming) && incoming >= 0) return Math.floor(incoming);
          if (existing && Number.isFinite(Number(existing.stock))) return Math.max(0, Number(existing.stock));
          return 9999;
        })(),
        maxPerOrder: Number(m?.maxOrders || Number(existing?.maxPerOrder || 10)),
        addons: Array.isArray(m?.addons) ? m.addons.map((a) => ({ name: String(a?.name || ""), price: Number(a?.price || 0) })) : [],
        variants: [],
        priceDropped: false,
        priceDropPercent: 0,
        imageTitles: [],
        imageDescriptions: [],
        imageMeta: []
      };
    });
  });
  const menuItemsToPersist = menuItemsFromVendors.length ? menuItemsFromVendors : db.menuItems;
  if (menuItemsToPersist.length) {
    const normalizedMenuItems = normalizeMenuItemRowsForSupabase(menuItemsToPersist.map((x) => ({
      ...(() => {
        const rawImages = Array.isArray(x.images) && x.images.length ? x.images : x.image ? [x.image] : [];
        const n = normalizeImagePayload(rawImages, x.imageTitles, x.imageDescriptions, x.imageMeta);
        return {
          id: x.id,
          restaurant_id: x.restaurantId,
          category: x.category,
          name: x.name,
          description: x.description || "",
          price: x.price,
          mrp: resolveStoredMenuMrp(x.mrp, x.price),
          price_dropped: x.priceDropped === true,
          price_drop_percent: Number(x.priceDropPercent || 0),
          hero_image: x.heroImage || "",
          image: x.image || n.images[0] || null,
          image_titles: n.imageTitles,
          image_descriptions: n.imageDescriptions,
          image_meta: n.imageMeta,
          available: x.available !== false,
          is_veg: !!x.isVeg,
          tags: x.tags || [],
          stock: x.stock || 0
        };
      })(),
      max_per_order: x.maxPerOrder || 10,
      addons: x.addons || [],
      variants: x.variants || []
    })));
    try {
      await supabaseUpsertWithOptionalPriceFields(FOOD_MENU_ITEM_TABLE, normalizedMenuItems);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      await supabaseUpsertWithOptionalPriceFields(LEGACY_FOOD_MENU_ITEM_TABLE, normalizedMenuItems);
    }
  }
  if (db.bookings.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_bookings", db.bookings.map((x) => ({
      id: x.id,
      type: x.type,
      item_id: x.itemId,
      user_name: x.userName,
      email: x.email,
      phone: x.phone,
      guests: x.guests,
      check_in: x.checkIn || null,
      check_out: x.checkOut || null,
      room_type: x.roomType || null,
      num_rooms: x.numRooms || 1,
      tour_date: x.tourDate || null,
      special_requests: x.specialRequests || "",
      pricing: x.pricing || {},
      status: x.status || "pending",
      booking_date: x.bookingDate || null,
      aadhaar_url: x.aadhaarUrl || "",
      country_code: String(x.countryCode || ""),
      paid_amount: x.paidAmount === void 0 ? null : Number(x.paidAmount),
      razorpay_payment_id: String(x.razorpayPaymentId || ""),
      razorpay_order_id: String(x.razorpayOrderId || "")
    })));
  }
  if (db.cabBookings.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_cab_bookings", db.cabBookings.map((x) => ({
      id: x.id,
      user_name: x.userName,
      email: String(x.email || ""),
      phone: x.phone,
      pickup_location: x.pickupLocation,
      drop_location: x.dropLocation,
      datetime: x.datetime,
      passengers: x.passengers,
      vehicle_type: x.vehicleType,
      estimated_fare: x.estimatedFare,
      booking_mode: String(x.bookingMode || "union"),
      quoted_fare: Number(x.quotedFare || 0),
      quoted_at: nullableText(x.quotedAt) || null,
      quoted_by: String(x.quotedBy || ""),
      quote_status: String(x.quoteStatus || ""),
      service_area_id: x.serviceAreaId || null,
      selected_bid_id: String(x.selectedBidId || ""),
      assigned_driver_id: String(x.assignedDriverId || ""),
      payment_status: String(x.paymentStatus || ""),
      payment_required: x.paymentRequired === true,
      payment_due_amount: Number(x.paymentDueAmount || 0),
      payment_bid_id: String(x.paymentBidId || ""),
      payment_order_id: String(x.paymentOrderId || ""),
      payment_order_amount: Number(x.paymentOrderAmount || 0),
      payment_currency: String(x.paymentCurrency || ""),
      payment_paid_at: nullableText(x.paymentPaidAt) || null,
      payment_id: String(x.paymentId || ""),
      payment_signature: String(x.paymentSignature || ""),
      ride_otp: String(x.rideOtp || ""),
      ride_otp_issued_at: nullableText(x.rideOtpIssuedAt) || null,
      ride_otp_status: ["pending", "verified", "not_required"].includes(String(x.rideOtpStatus || "").trim().toLowerCase()) ? String(x.rideOtpStatus || "").trim().toLowerCase() : "not_required",
      ride_otp_verified_at: nullableText(x.rideOtpVerifiedAt) || null,
      ride_otp_verified_by: String(x.rideOtpVerifiedBy || ""),
      pickup_updated_at: nullableText(x.pickupUpdatedAt) || null,
      pickup_updated_by: String(x.pickupUpdatedBy || ""),
      fine_amount: Number(x.fineAmount || 0),
      fine_status: String(x.fineStatus || "none"),
      fine_reason: String(x.fineReason || ""),
      no_show_reported_by: String(x.noShowReportedBy || ""),
      no_show_reported_at: nullableText(x.noShowReportedAt) || null,
      pricing: x.pricing || {},
      status: x.status || "pending",
      created_at: x.createdAt || null,
      updated_at: x.updatedAt || null
    })));
  }
  if (db.driverRegistrationRequests?.length) {
    try {
      await supabaseUpsert("ev_driver_registration_requests", db.driverRegistrationRequests.map((x) => ({
        id: String(x.id || ""),
        name: String(x.name || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        vehicle_type: String(x.vehicleType || ""),
        vehicle_number: String(x.vehicleNumber || ""),
        license_number: String(x.licenseNumber || ""),
        id_proof_url: String(x.idProofUrl || ""),
        notes: String(x.notes || ""),
        status: String(x.status || "pending"),
        reviewed_by: String(x.reviewedBy || ""),
        reviewed_at: x.reviewedAt || null,
        rejection_reason: String(x.rejectionReason || ""),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.drivers?.length) {
    try {
      await supabaseUpsert("ev_drivers", db.drivers.map((x) => ({
        id: String(x.id || ""),
        registration_request_id: String(x.registrationRequestId || ""),
        name: String(x.name || ""),
        username: String(x.username || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        password_hash: String(x.passwordHash || ""),
        status: String(x.status || "pending"),
        rating: Number(x.rating || 4.5),
        active: x.active !== false,
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.driverVehicles?.length) {
    try {
      await supabaseUpsert("ev_driver_vehicles", db.driverVehicles.map((x) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        vehicle_type: String(x.vehicleType || ""),
        viechle_cat: String(x.viechle_cat || x.vehicleType || ""),
        vehicle_number: String(x.vehicleNumber || ""),
        color: String(x.color || ""),
        model: String(x.model || ""),
        seats: Number(x.seats || 4),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.driverDocuments?.length) {
    try {
      await supabaseUpsert("ev_driver_documents", db.driverDocuments.map((x) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        registration_request_id: String(x.registrationRequestId || ""),
        kind: String(x.kind || "other"),
        url: String(x.url || ""),
        label: String(x.label || ""),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.driverAvailability?.length) {
    try {
      await supabaseUpsert("ev_driver_availability", db.driverAvailability.map((x) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        online: x.online === true,
        lat: x.lat === void 0 ? null : Number(x.lat),
        lng: x.lng === void 0 ? null : Number(x.lng),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.driverBids?.length) {
    try {
      await supabaseUpsert("ev_cab_bids", db.driverBids.map((x) => ({
        id: String(x.id || ""),
        ride_request_id: String(x.rideRequestId || ""),
        driver_id: String(x.driverId || ""),
        bid_price: Number(x.bidPrice || 0),
        eta_min: Number(x.etaMin || 0),
        status: String(x.status || "active"),
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.rideAssignments?.length) {
    try {
      await supabaseUpsert("ev_ride_assignments", db.rideAssignments.map((x) => ({
        id: String(x.id || ""),
        ride_request_id: String(x.rideRequestId || ""),
        driver_id: String(x.driverId || ""),
        bid_id: String(x.bidId || ""),
        status: String(x.status || "assigned"),
        assigned_at: x.assignedAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.busRoutes.length) {
    try {
      await supabaseUpsert("ev_buses", db.busRoutes.map((x) => ({
        id: x.id,
        operator_name: x.operatorName,
        operator_code: x.operatorCode || "",
        from_city: x.fromCity,
        from_code: x.fromCode || "",
        to_city: x.toCity,
        to_code: x.toCode || "",
        departure_time: x.departureTime || "",
        arrival_time: x.arrivalTime || "",
        duration_text: x.durationText || "",
        bus_type: x.busType || "Non AC",
        fare: Number(x.fare || 0),
        total_seats: Number(x.totalSeats || 20),
        seat_layout: x.seatLayout || [],
        service_dates: x.serviceDates || [],
        seats_booked_by_date: x.seatsBookedByDate || {},
        hero_image: x.heroImage || "",
        active: x.active !== false,
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.busBookings.length) {
    try {
      await supabaseUpsert("ev_bus_bookings", db.busBookings.map((x) => ({
        id: x.id,
        route_id: x.routeId,
        user_name: x.userName,
        email: String(x.email || ""),
        phone: x.phone,
        from_city: x.fromCity,
        to_city: x.toCity,
        travel_date: x.travelDate,
        seats: x.seats || [],
        fare_per_seat: Number(x.farePerSeat || 0),
        total_fare: Number(x.totalFare || 0),
        status: x.status || "pending",
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.bikeRentals?.length) {
    try {
      await supabaseUpsert("ev_bike_rentals", db.bikeRentals.map((x) => ({
        id: String(x.id || ""),
        name: String(x.name || ""),
        location: String(x.location || ""),
        bike_type: String(x.bikeType || "Scooter"),
        price_per_hour: Number(x.pricePerHour || 0),
        price_per_day: Number(x.pricePerDay || 0),
        available_qty: Number(x.availableQty || 0),
        security_deposit: Number(x.securityDeposit || 0),
        helmet_included: x.helmetIncluded !== false,
        vendor_mobile: String(x.vendorMobile || ""),
        image: String(x.image || ""),
        active: x.active !== false,
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.bikeBookings?.length) {
    try {
      await supabaseUpsert("ev_bike_bookings", db.bikeBookings.map((x) => ({
        id: String(x.id || ""),
        bike_rental_id: String(x.bikeRentalId || ""),
        user_name: String(x.userName || ""),
        phone: String(x.phone || ""),
        start_datetime: String(x.startDateTime || ""),
        hours: Number(x.hours || 1),
        qty: Number(x.qty || 1),
        total_fare: Number(x.totalFare || 0),
        status: String(x.status || "pending"),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.foodOrders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_food_orders", db.foodOrders.map((x) => ({
      id: x.id,
      user_id: String(x.userId || ""),
      restaurant_id: String(x.restaurantId || ""),
      user_name: x.userName,
      email: String(x.email || ""),
      phone: x.phone,
      items: x.items || [],
      delivery_address: x.deliveryAddress,
      delivery_pincode: String(x.deliveryPincode || ""),
      delivery_address_id: String(x.deliveryAddressId || ""),
      delivery_region: String(x.deliveryRegion || ""),
      special_instructions: x.specialInstructions || "",
      pricing: x.pricing || {},
      status: x.status || "pending",
      order_time: x.orderTime || null
    })));
  }
  if (db.carts?.length) {
    try {
      await supabaseUpsert("ev_food_carts", db.carts.map((x) => ({
        id: String(x.id || makeId("cart")),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        restaurant_id: String(x.restaurantId || ""),
        items: Array.isArray(x.items) ? x.items : [],
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.martCarts?.length) {
    try {
      await supabaseUpsert("ev_mart_carts", db.martCarts.map((x) => ({
        id: String(x.id || makeId("martcart")),
        user_id: String(x.userId || ""),
        user_name: String(x.userName || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        delivery_address: String(x.deliveryAddress || ""),
        items: Array.isArray(x.items) ? x.items : [],
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.queries.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_queries", db.queries.map((x) => ({
      id: x.id,
      user_name: x.userName,
      email: x.email,
      phone: x.phone,
      subject: x.subject,
      message: x.message,
      status: x.status || "pending",
      order_id: x.orderId || "",
      order_type: x.orderType || "",
      source: x.source || "contact_page",
      submitted_at: x.submittedAt || null,
      responded_at: x.respondedAt || null,
      response: x.response || null
    })));
  }
  if (db.auditLog.length) {
    const tail = db.auditLog.length > 2e3 ? db.auditLog.slice(-2e3) : db.auditLog;
    await supabaseInsertIgnoreDuplicates("ev_audit_log", tail.map((x) => ({
      id: x.id,
      at: x.at,
      admin_chat_id: x.adminChatId ?? null,
      action: x.action,
      entity: x.entity || null,
      entity_id: x.entityId || null,
      meta: x.meta || {}
    })));
  }
  if (db.cabProviders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_cab_providers", db.cabProviders.map((x) => ({
      id: x.id,
      name: x.name,
      vehicle_type: x.vehicleType,
      plate_number: x.plateNumber,
      capacity: x.capacity,
      vendor_mobile: x.vendorMobile || "",
      additional_comments: x.additionalComments || "",
      price_dropped: x.priceDropped === true,
      price_drop_percent: Number(x.priceDropPercent || 0),
      hero_image: x.heroImage || "",
      active: x.active !== false,
      service_area_id: x.serviceAreaId || null
    })));
  }
  if (db.cabRates?.length) {
    try {
      await supabaseUpsert("ev_cab_rates", db.cabRates.map((x) => ({
        id: x.id || void 0,
        origin: x.origin,
        destination: x.destination,
        route_label: x.routeLabel || "",
        ordinary_4_1: x.ordinary4_1 ?? null,
        luxury_4_1: x.luxury4_1 ?? null,
        ordinary_6_1: x.ordinary6_1 ?? null,
        luxury_6_1: x.luxury6_1 ?? null,
        traveller: x.traveller ?? null
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.serviceAreas.length) {
    await supabaseUpsert("ev_service_areas", db.serviceAreas.map((x) => ({
      id: x.id,
      name: x.name,
      city: x.city,
      enabled: x.enabled !== false
    })));
  }
  if (db.coupons.length) {
    await supabaseUpsert("ev_coupons", db.coupons.map((x) => ({
      code: x.code,
      type: x.type,
      amount: x.amount,
      min_cart: x.minCart || 0,
      category: x.category || "all",
      expiry: x.expiry,
      max_uses: x.maxUses || null
    })), "code");
  }
  const userProfiles = db.userProfiles;
  if (userProfiles?.length) {
    try {
      const mappedProfiles = userProfiles.map((x) => ({
        id: String(x.id || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        address: String(x.address || ""),
        city: String(x.city || ""),
        state: String(x.state || ""),
        pincode: String(x.pincode || ""),
        landmark: String(x.landmark || ""),
        default_address_id: String(x.defaultAddressId || ""),
        ip_address: String(x.ipAddress || ""),
        browser: String(x.browser || ""),
        password: String(x.password || ""),
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO(),
        orders: Array.isArray(x.orders) ? x.orders : [],
        // Was absent from this mapping, so everything written to a profile's
        // notification list - order confirmations, desk fare quotes, admin
        // broadcasts - was dropped on the way to Supabase and the bell stayed
        // empty. Stripped automatically if the column has not been added yet.
        push_notifications: Array.isArray(x.pushNotifications) ? x.pushNotifications : []
      }));
      await supabaseUpsertWithOptionalPriceFields(supabaseUserProfileTable(), dedupeUserProfilesByEmail(mappedProfiles));
    } catch (err) {
      if (isMissingTableError(err)) {
      } else if (isUserProfilesDuplicateEmailError(err)) {
        console.warn(`[jsondb] ${supabaseUserProfileTable()} upsert skipped due to duplicate email constraint:`, String(err?.message || err));
      } else {
        throw err;
      }
    }
  }
  const userBehaviorProfiles = db.userBehaviorProfiles;
  if (userBehaviorProfiles?.length) {
    try {
      await supabaseUpsert("ev_user_behavior_profiles", dedupeUserBehaviorProfiles(userBehaviorProfiles.map((x) => ({
        id: String(x.id || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        core_identity: x.coreIdentity || {},
        device_fingerprinting: x.deviceFingerprinting || {},
        location_mobility: x.locationMobility || {},
        behavioral_analytics: x.behavioralAnalytics || {},
        transaction_payment: x.transactionPayment || {},
        preference_personalization: x.preferencePersonalization || {},
        ratings_reviews_feedback: x.ratingsReviewsFeedback || {},
        marketing_attribution: x.marketingAttribution || {},
        trust_safety_fraud: x.trustSafetyFraud || {},
        derived_inferred: x.derivedInferred || {},
        orders: Array.isArray(x.orders) ? x.orders : [],
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      }))));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  const analyticsEvents = db.analyticsEvents;
  if (analyticsEvents?.length) {
    try {
      const ordered = analyticsEvents.slice().sort((a, b) => new Date(a?.at || 0).getTime() - new Date(b?.at || 0).getTime()).slice(-5e3);
      await supabaseUpsert("ev_analytics_events", ordered.map((x) => ({
        id: String(x.id || ""),
        type: String(x.type || ""),
        category: String(x.category || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        at: x.at || nowISO(),
        meta: x.meta || {}
      })), "id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.sitePages) {
    try {
      const sitePageRows = Object.values(db.sitePages).map((x) => ({
        slug: String(x?.slug || ""),
        title: String(x?.title || x?.slug || ""),
        content: String(x?.content || ""),
        updated_at: x?.updatedAt || nowISO()
      })).filter((x) => x.slug);
      if (sitePageRows.length) {
        await supabaseUpsert("ev_site_pages", sitePageRows, "slug");
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  invalidateDatabaseCache();
}
function invalidateDatabaseCache() {
  dbCacheValue = null;
  dbCacheAt = 0;
}
function cloneDatabase(db) {
  const structured = globalThis.structuredClone;
  if (typeof structured === "function") return structured(db);
  return JSON.parse(JSON.stringify(db));
}
async function readData() {
  if (!shouldUseSupabase()) return loadLocalDatabase();
  assertSupabaseConfigured();
  if (DB_CACHE_TTL_MS > 0 && dbCacheValue && Date.now() - dbCacheAt < DB_CACHE_TTL_MS) {
    return cloneDatabase(dbCacheValue);
  }
  if (dbLoadInFlight) return cloneDatabase(await dbLoadInFlight);
  const inFlight = (async () => {
    try {
      const value = await loadSupabaseDatabase();
      if (DB_CACHE_TTL_MS > 0) {
        dbCacheValue = value;
        dbCacheAt = Date.now();
      }
      return value;
    } catch (err) {
      if (shouldFallbackToLocalOnSupabaseError(err)) {
        console.warn("[jsondb] Supabase read failed. Falling back to local data.json.", String(err?.message || err));
        return loadLocalDatabase();
      }
      throw err;
    } finally {
      dbLoadInFlight = null;
    }
  })();
  dbLoadInFlight = inFlight;
  return cloneDatabase(await inFlight);
}
function parseBackupStampFromName(name) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/.exec(name);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}
async function pruneBackupDirBestEffort() {
  try {
    if (!BACKUP_SNAPSHOTS_ENABLED) return;
    if (!await import_fs_extra.default.pathExists(BACKUP_DIR)) return;
    const files = (await import_fs_extra.default.readdir(BACKUP_DIR)).filter((n) => n.toLowerCase().endsWith(".json")).map((n) => ({
      name: n,
      fullPath: import_path3.default.join(BACKUP_DIR, n),
      ts: parseBackupStampFromName(n)
    }));
    const now = Date.now();
    if (Number.isFinite(BACKUP_RETENTION_DAYS) && BACKUP_RETENTION_DAYS > 0) {
      const cutoff = now - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1e3;
      for (const f of files) {
        const ts = f.ts ?? (await import_fs_extra.default.stat(f.fullPath)).mtimeMs;
        if (ts < cutoff) await import_fs_extra.default.remove(f.fullPath);
      }
    }
    if (Number.isFinite(BACKUP_KEEP_MAX) && BACKUP_KEEP_MAX > 0) {
      const remaining = (await import_fs_extra.default.readdir(BACKUP_DIR)).filter((n) => n.toLowerCase().endsWith(".json")).map((n) => ({ name: n, fullPath: import_path3.default.join(BACKUP_DIR, n), ts: parseBackupStampFromName(n) }));
      if (remaining.length > BACKUP_KEEP_MAX) {
        const sorted = remaining.map((x) => ({ ...x, ts2: x.ts ?? 0 })).sort((a, b) => b.ts2 - a.ts2);
        const toDelete = sorted.slice(BACKUP_KEEP_MAX);
        for (const f of toDelete) await import_fs_extra.default.remove(f.fullPath);
      }
    }
  } catch {
  }
}
async function writeBackupSnapshot(db, label) {
  if (!label) return;
  if (!BACKUP_SNAPSHOTS_ENABLED) return;
  const normalized = String(label || "").trim();
  if (!normalized) return;
  const lower = normalized.toLowerCase();
  if (BACKUP_SKIP_PREFIXES.some((p) => lower.startsWith(p))) return;
  const now = Date.now();
  const last = lastBackupAtByLabel.get(normalized) || 0;
  if (Number.isFinite(BACKUP_MIN_INTERVAL_SEC) && BACKUP_MIN_INTERVAL_SEC > 0) {
    if (now - last < BACKUP_MIN_INTERVAL_SEC * 1e3) return;
  }
  lastBackupAtByLabel.set(normalized, now);
  await import_fs_extra.default.ensureDir(BACKUP_DIR);
  const stamp = nowISO().replace(/[:.]/g, "-");
  const out = import_path3.default.join(BACKUP_DIR, `${stamp}_${normalized}.json`);
  await import_fs_extra.default.writeFile(out, JSON.stringify(db, null, 2), "utf8");
  await pruneBackupDirBestEffort();
}
async function mutateData(mutator, backupLabel) {
  if (!shouldUseSupabase()) {
    const db2 = await loadLocalDatabase();
    const before2 = DatabaseSchema.parse(JSON.parse(JSON.stringify(db2)));
    await writeBackupSnapshot(db2, backupLabel);
    mutator(db2);
    const skipOperationalRules2 = String(backupLabel || "").toLowerCase().startsWith("analytics");
    if (!skipOperationalRules2) {
      applyOperationalRules(before2, db2);
    }
    syncUserProfilesFromOrders(db2);
    syncUserBehaviorProfilesFromData(db2);
    const validated2 = DatabaseSchema.parse(db2);
    await writeLocalDatabase(validated2);
    return validated2;
  }
  assertSupabaseConfigured();
  let db;
  if (FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR) {
    try {
      db = await loadSupabaseDatabase();
    } catch (err) {
      if (!shouldFallbackToLocalOnSupabaseError(err)) throw err;
      console.warn("[jsondb] Supabase mutate read failed. Falling back to local data.json.", String(err?.message || err));
      db = await loadLocalDatabase();
    }
  } else {
    db = await loadSupabaseDatabase();
  }
  const before = DatabaseSchema.parse(JSON.parse(JSON.stringify(db)));
  await writeBackupSnapshot(db, backupLabel);
  mutator(db);
  const skipOperationalRules = String(backupLabel || "").toLowerCase().startsWith("analytics");
  if (!skipOperationalRules) {
    applyOperationalRules(before, db);
  }
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  await writeSupabaseDatabase(validated);
  return validated;
}
async function writeData(db) {
  if (!shouldUseSupabase()) {
    syncUserProfilesFromOrders(db);
    syncUserBehaviorProfilesFromData(db);
    const validated2 = DatabaseSchema.parse(db);
    await writeLocalDatabase(validated2);
    return validated2;
  }
  assertSupabaseConfigured();
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  if (FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR) {
    try {
      await writeSupabaseDatabase(validated);
    } catch (err) {
      if (!shouldFallbackToLocalOnSupabaseError(err)) throw err;
      console.warn("[jsondb] Supabase write failed. Falling back to local data.json.", String(err?.message || err));
      await writeLocalDatabase(validated);
    }
    return validated;
  }
  await writeSupabaseDatabase(validated);
  return validated;
}
var import_fs_extra, import_path3, BACKUP_DIR, BACKUP_SNAPSHOTS_ENABLED, BACKUP_RETENTION_DAYS, BACKUP_KEEP_MAX, BACKUP_MIN_INTERVAL_SEC, BACKUP_SKIP_PREFIXES, lastBackupAtByLabel, LOCAL_DB_PATH, FORCE_SUPABASE, FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR, warnedLocal, FOOD_VENDOR_TABLE, LEGACY_FOOD_VENDOR_TABLE, FOOD_MENU_ITEM_TABLE, LEGACY_FOOD_MENU_ITEM_TABLE, FOOD_VENDOR_MENU_TABLE, LEGACY_FOOD_VENDOR_MENU_TABLE, DEFAULT_SETTINGS, DEFAULT_POLICIES, DEFAULT_PAYMENTS, DEFAULT_SITE_PAGES, SELECT_PAGE_CONCURRENCY, DB_CACHE_TTL_MS, dbCacheValue, dbCacheAt, dbLoadInFlight;
var init_jsondb = __esm({
  "vendor/server/services/jsondb.ts"() {
    import_fs_extra = __toESM(require("fs-extra"));
    import_path3 = __toESM(require("path"));
    init_src();
    init_userProfiles();
    init_operationalRules();
    init_foodPricing();
    BACKUP_DIR = import_path3.default.join(process.cwd(), "..", "data", "backups");
    BACKUP_SNAPSHOTS_ENABLED = String(process.env.EV_BACKUP_SNAPSHOTS || "").trim() === "1";
    BACKUP_RETENTION_DAYS = Number(process.env.EV_BACKUP_RETENTION_DAYS || 7);
    BACKUP_KEEP_MAX = Number(process.env.EV_BACKUP_KEEP_MAX || 200);
    BACKUP_MIN_INTERVAL_SEC = Number(process.env.EV_BACKUP_MIN_INTERVAL_SEC || 300);
    BACKUP_SKIP_PREFIXES = String(process.env.EV_BACKUP_SKIP_PREFIXES || "analytics_").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    lastBackupAtByLabel = /* @__PURE__ */ new Map();
    LOCAL_DB_PATH = import_path3.default.join(process.cwd(), "..", "data", "data.json");
    FORCE_SUPABASE = String(process.env.EV_FORCE_SUPABASE || "").trim() === "1";
    FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR = String(process.env.EV_DB_FALLBACK_TO_LOCAL || "").trim() === "1";
    warnedLocal = false;
    FOOD_VENDOR_TABLE = "ev_food_vendors";
    LEGACY_FOOD_VENDOR_TABLE = "ev_restaurants";
    FOOD_MENU_ITEM_TABLE = "ev_food_menu_items";
    LEGACY_FOOD_MENU_ITEM_TABLE = "ev_menu_items";
    FOOD_VENDOR_MENU_TABLE = "ev_food_vendor_menus";
    LEGACY_FOOD_VENDOR_MENU_TABLE = "ev_vendor_menus";
    DEFAULT_SETTINGS = {
      currency: "INR",
      pageSlugs: {
        affiliateProgram: "affiliate-program",
        contactUs: "contact-us",
        privacyPolicy: "privacy-policy",
        refundPolicy: "refund-policy",
        termsAndConditions: "terms-and-conditions"
      },
      taxRules: {
        hotel: { slabs: [{ min: 0, max: 999, gst: 0 }, { min: 1e3, max: 7500, gst: 0.05 }, { min: 7500.01, max: null, gst: 0.18 }] },
        tour: { gst: 0.05, mode: "NO_ITC" },
        food: { gst: 0.05, mode: "DEFAULT" },
        cab: { gst: 0.05, mode: "DEFAULT" },
        invoice: {
          brandName: "ExploreValley",
          logoUrl: "",
          sellerName: "ExploreValley Pvt Ltd",
          sellerAddress: "",
          gstin: "",
          fssai: "",
          cin: "",
          pan: "",
          placeOfSupply: "",
          supportEmail: "",
          supportPhone: "",
          authorizedSignatory: "Authorised Signatory",
          defaultHsnOrSac: "9964",
          defaultGstPercent: 5,
          terms: [],
          serviceProfiles: {}
        }
      }
    };
    DEFAULT_POLICIES = {
      hotel: { freeCancelHours: 24, feeAfter: 0.5 },
      tour: { freeCancelHours: 24, feeAfter: 0.5 },
      cab: { freeCancelMinutes: 15, feeAfter: 50 },
      food: { allowCancelMinutes: 5, feeAfter: 20 }
    };
    DEFAULT_PAYMENTS = {
      walletEnabled: false,
      refundMethod: "original",
      refundWindowHours: 72
    };
    DEFAULT_SITE_PAGES = {
      affiliateProgram: { title: "Affiliate Program", slug: "affiliate-program", content: "" },
      contactUs: { title: "Contact Us", slug: "contact-us", content: "" },
      privacyPolicy: { title: "Privacy Policy", slug: "privacy-policy", content: "" },
      refundPolicy: { title: "Refund Policy", slug: "refund-policy", content: "" },
      termsAndConditions: { title: "Terms and Conditions", slug: "terms-and-conditions", content: "" }
    };
    SELECT_PAGE_CONCURRENCY = 6;
    DB_CACHE_TTL_MS = (() => {
      const raw = process.env.DB_CACHE_TTL_MS;
      const n = raw === void 0 || raw === "" ? 15e3 : Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 15e3;
    })();
    dbCacheValue = null;
    dbCacheAt = 0;
    dbLoadInFlight = null;
  }
});

// src/server/bootstrap.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));

// src/server/env.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function decodeBase32(input) {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = value << 5 | idx;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function parseEnvText(text) {
  const parsed = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted = value.startsWith('"') && value.endsWith('"') && value.length >= 2 || value.startsWith("'") && value.endsWith("'") && value.length >= 2;
    if (quoted) value = value.slice(1, -1);
    parsed[key] = value;
  }
  return parsed;
}
function loadEnvironment(packageRoot3) {
  const lloPath = import_path.default.join(packageRoot3, ".llo");
  const envPath = import_path.default.join(packageRoot3, ".env");
  let text = null;
  let usedFile = "";
  if (import_fs.default.existsSync(lloPath)) {
    const raw = import_fs.default.readFileSync(lloPath, "utf8");
    text = decodeBase32(raw).toString("utf8");
    usedFile = ".llo";
    if (!text.trim()) {
      console.error("[ev-admin] .llo decoded to nothing. Regenerate it with: npm run env:encode");
      return null;
    }
  } else if (import_fs.default.existsSync(envPath)) {
    text = import_fs.default.readFileSync(envPath, "utf8");
    usedFile = ".env";
    console.warn("[ev-admin] No .llo found - falling back to .env. Create .llo with: npm run env:encode");
  } else {
    console.error("[ev-admin] Neither .llo nor .env is present. Nothing to load.");
    return null;
  }
  const parsed = parseEnvText(text);
  let applied = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === void 0) {
      process.env[key] = value;
      applied += 1;
    }
  }
  return { file: usedFile, keys: applied };
}

// src/server/bootstrap.ts
var packageRoot = import_path2.default.resolve(__dirname, "..");
var envSource = loadEnvironment(packageRoot);
if (envSource) {
  console.log(`[ev-admin] settings loaded from ${envSource.file}, ${envSource.keys} keys`);
}
var runtimeDir = import_path2.default.join(packageRoot, "runtime");
var dataDir = import_path2.default.join(packageRoot, "data");
import_fs2.default.mkdirSync(runtimeDir, { recursive: true });
import_fs2.default.mkdirSync(dataDir, { recursive: true });
process.chdir(runtimeDir);

// src/server/index.ts
var import_express5 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_path7 = __toESM(require("path"));
var import_fs4 = __toESM(require("fs"));

// vendor/server/routes/admin.ts
var import_express = require("express");
var import_multer = __toESM(require("multer"));
var import_sharp = __toESM(require("sharp"));
var import_pdfkit = __toESM(require("pdfkit"));
var import_path4 = __toESM(require("path"));
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var import_crypto = __toESM(require("crypto"));
var import_openai = __toESM(require("openai"));
var import_zod2 = require("zod");
init_src();
init_jsondb();
init_operationalRules();

// vendor/server/services/invoice.ts
init_src();
function safeText4(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function supabaseUrl2() {
  return safeText4(process.env.SUPABASE_URL).replace(/\/+$/, "");
}
function supabaseServiceRoleKey2() {
  return safeText4(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}
function supabaseConfigured() {
  return !!supabaseUrl2() && !!supabaseServiceRoleKey2();
}
function supabaseHeaders2() {
  const key = supabaseServiceRoleKey2();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}
function normalizeTable(table) {
  const t = safeText4(table).toLowerCase();
  if (t === "cabbookings" || t === "ev_cab_bookings") return "ev_cab_bookings";
  if (t === "travelbookings" || t === "bookings" || t === "ev_bookings") return "ev_bookings";
  if (t === "busbookings" || t === "ev_bus_bookings") return "ev_bus_bookings";
  if (t === "bikebookings" || t === "ev_bike_bookings" || t === "ev_rental_bookings") return "ev_rental_bookings";
  if (t === "foodorders" || t === "ev_food_orders") return "ev_food_orders";
  if (t === "martorders" || t === "ev_mart_orders") return "ev_mart_orders";
  return t;
}
function makeInvoiceNo(now = /* @__PURE__ */ new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const t = now.getTime().toString().slice(-6);
  return `EV-INV-${y}${m}${d}-${t}`;
}
function invoiceIdFor(table, transactionId) {
  const raw = `${table}_${transactionId}`.replace(/[^a-z0-9_]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  const clipped = raw.slice(0, 90);
  return `inv_${clipped || makeId("tx")}`;
}
function amountFromPricing(pricing) {
  if (!pricing || typeof pricing !== "object") return 0;
  const fromTotal = num(pricing.totalAmount || pricing.total_amount);
  if (fromTotal > 0) return fromTotal;
  const fromGrand = num(pricing.grandTotal || pricing.grand_total);
  if (fromGrand > 0) return fromGrand;
  return 0;
}
function amountFromItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list.reduce((sum, x) => {
    const qty = Math.max(1, Math.floor(num(x?.quantity || x?.qty || 1)));
    const price = num(x?.price || x?.unitPrice || x?.unit_price || 0);
    return sum + qty * price;
  }, 0);
}
function deriveAmount(row) {
  const direct = [
    row?.amount,
    row?.paid_amount,
    row?.paidAmount,
    row?.total_price,
    row?.totalPrice,
    row?.total_amount,
    row?.totalAmount,
    row?.total_fare,
    row?.totalFare,
    row?.estimated_fare,
    row?.estimatedFare
  ].map(num).find((n) => n > 0);
  if (direct && direct > 0) return direct;
  const pricingAmount = amountFromPricing(row?.pricing);
  if (pricingAmount > 0) return pricingAmount;
  const itemAmount = amountFromItems(row?.items);
  if (itemAmount > 0) return itemAmount;
  return 0;
}
function serviceNameFor(table, row) {
  if (table === "ev_bookings") {
    const t = safeText4(row?.type).toLowerCase();
    if (t === "tour") return "Tour Booking";
    return "Stay Booking";
  }
  if (table === "ev_cab_bookings") return "Cab Booking";
  if (table === "ev_bus_bookings") return "Bus Booking";
  if (table === "ev_rental_bookings") return "Bike Booking";
  if (table === "ev_food_orders") return "Food Order";
  if (table === "ev_mart_orders") return "Mart Order";
  return "Transaction";
}
function serviceIdFor(table, row) {
  if (table === "ev_bookings") return safeText4(row?.item_id || row?.itemId || row?.type || "");
  if (table === "ev_cab_bookings") return safeText4(row?.service_area_id || row?.serviceAreaId || row?.rate_id || row?.rateId || "");
  if (table === "ev_bus_bookings") return safeText4(row?.bus_id || row?.busId || row?.route_id || row?.routeId || "");
  if (table === "ev_rental_bookings") return safeText4(row?.bike_rental_id || row?.bikeRentalId || row?.vehicle_id || row?.vehicleId || "");
  if (table === "ev_food_orders") return safeText4(row?.restaurant_id || row?.restaurantId || "");
  if (table === "ev_mart_orders") return safeText4(row?.mart_partner_id || row?.martPartnerId || row?.store_id || row?.storeId || "");
  return "";
}
function userNameFromRow(row) {
  return safeText4(row?.user_name || row?.userName || row?.customer_name || row?.customerName || row?.name || "Customer");
}
function emailFromRow(row) {
  return safeText4(row?.email || row?.user_email || row?.userEmail);
}
function phoneFromRow(row) {
  return safeText4(row?.phone || row?.mobile || row?.user_phone || row?.userPhone);
}
function isCompleted(row) {
  return safeText4(row?.status).toLowerCase() === "completed";
}
var SUPPORTED_TRANSACTION_TABLES = /* @__PURE__ */ new Set([
  "ev_bookings",
  "ev_cab_bookings",
  "ev_bus_bookings",
  "ev_rental_bookings",
  "ev_food_orders",
  "ev_mart_orders"
]);
async function ensureInvoiceForCompletedTransaction(params) {
  const table = normalizeTable(params.table);
  const row = params.row || {};
  if (!SUPPORTED_TRANSACTION_TABLES.has(table)) return { ok: true, skipped: "UNSUPPORTED_TABLE" };
  if (!isCompleted(row)) return { ok: true, skipped: "NOT_COMPLETED" };
  const transactionId = safeText4(row?.id || row?.transaction_id || row?.transactionId);
  if (!transactionId) return { ok: true, skipped: "MISSING_TRANSACTION_ID" };
  if (!supabaseConfigured()) return { ok: true, skipped: "SUPABASE_NOT_CONFIGURED" };
  const now = /* @__PURE__ */ new Date();
  const nowIso = now.toISOString();
  const invoiceId = invoiceIdFor(table, transactionId);
  const invoiceNo = makeInvoiceNo(now);
  const amount = deriveAmount(row);
  const paymentMethod = safeText4(row?.payment_method || row?.paymentMethod || row?.payment_mode || row?.paymentMode || "system");
  const paymentId = safeText4(row?.payment_id || row?.paymentId || `${table}:${transactionId}`);
  const serviceName = serviceNameFor(table, row);
  const serviceId = serviceIdFor(table, row);
  const invoiceRow = {
    id: invoiceId,
    invoice_no: invoiceNo,
    payment_id: paymentId,
    query_id: null,
    service_id: serviceId || null,
    service_name: serviceName,
    user_name: userNameFromRow(row),
    email: emailFromRow(row),
    phone: phoneFromRow(row),
    amount,
    currency: "INR",
    payment_method: paymentMethod,
    payment_status: "paid",
    issued_at: nowIso,
    meta: {
      source: safeText4(params.source || "system"),
      transactionTable: table,
      transactionId,
      transactionStatus: safeText4(row?.status || "completed"),
      rowSnapshot: row
    },
    created_at: nowIso,
    updated_at: nowIso
  };
  const endpoint = `${supabaseUrl2()}/rest/v1/ev_invoices?on_conflict=id`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...supabaseHeaders2(),
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([invoiceRow])
  });
  if (!resp.ok) {
    throw new Error(`INVOICE_CREATE_FAILED:${table}:${transactionId}:${resp.status}:${await resp.text()}`);
  }
  const rows = await resp.json().catch(() => []);
  const inserted = Array.isArray(rows) && rows[0] ? rows[0] : invoiceRow;
  return {
    ok: true,
    invoiceId: safeText4(inserted?.id || invoiceId),
    invoiceNo: safeText4(inserted?.invoice_no || invoiceNo),
    transactionId,
    table
  };
}

// vendor/server/middleware/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));

// vendor/server/services/runtimeConfig.ts
function requireTextEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}
function getJwtSecret() {
  return requireTextEnv("JWT_SECRET");
}
function getAdminAllowedEmail() {
  return requireTextEnv("ADMIN_ALLOWED_EMAIL").toLowerCase();
}
function getMartVendorJwtSecret() {
  const vendorSecret = String(process.env.MART_VENDOR_JWT_SECRET || "").trim();
  return vendorSecret || getJwtSecret();
}

// vendor/server/middleware/auth.ts
function readBearerToken(req) {
  const raw = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  if (!raw) return "";
  const m = raw.match(/^\s*Bearer\s+(.+)\s*$/i);
  if (!m) return "";
  const token = String(m[1] || "").trim();
  if (!token) return "";
  return token.replace(/^"+|"+$/g, "").trim();
}
function readQueryToken(req) {
  const candidates = [
    req?.query?.auth_token,
    req?.query?.access_token,
    req?.query?.token
  ];
  for (const value of candidates) {
    const token = String(value || "").trim().replace(/^"+|"+$/g, "");
    if (token) return token;
  }
  return "";
}
function supabaseUrl3() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}
function supabaseAnonKey() {
  return String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
}
function firebaseApiKey() {
  return String(process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "").trim();
}
async function verifySupabaseAccessToken(token) {
  const url = supabaseUrl3();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`
      }
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (!user?.id) return null;
    return {
      sub: String(user.id),
      email: user.email || null,
      phone: user.phone || null,
      name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      mode: "supabase_access"
    };
  } catch {
    return null;
  }
}
async function verifyFirebaseIdToken(token) {
  const key = firebaseApiKey();
  if (!key) return null;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    if (!r.ok) return null;
    const out = await r.json();
    const user = Array.isArray(out?.users) ? out.users[0] : null;
    if (!user?.localId) return null;
    return {
      sub: String(user.localId),
      email: user.email || null,
      phone: user.phoneNumber || null,
      name: user.displayName || null,
      mode: "firebase_id"
    };
  } catch {
    return null;
  }
}
function getAuthClaims(req) {
  return req.auth || null;
}
async function requireAuth(req, res, next) {
  const token = readBearerToken(req) || readQueryToken(req);
  if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });
  try {
    const decoded = import_jsonwebtoken.default.verify(token, getJwtSecret());
    if (!decoded?.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    req.auth = decoded;
    return next();
  } catch {
    const supabaseClaims = await verifySupabaseAccessToken(token);
    if (supabaseClaims?.sub) {
      req.auth = supabaseClaims;
      return next();
    }
    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (!firebaseClaims?.sub) return res.status(401).json({ error: "INVALID_TOKEN" });
    req.auth = firebaseClaims;
    return next();
  }
}

// vendor/server/routes/admin.ts
init_foodPricing();
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});
var FOOD_VENDOR_TABLE2 = "ev_food_vendors";
var LEGACY_FOOD_VENDOR_TABLE2 = "ev_restaurants";
var FOOD_MENU_ITEM_TABLE2 = "ev_food_menu_items";
var LEGACY_FOOD_MENU_ITEM_TABLE2 = "ev_menu_items";
var FOOD_VENDOR_MENU_TABLE2 = "ev_food_vendor_menus";
var LEGACY_FOOD_VENDOR_MENU_TABLE2 = "ev_vendor_menus";
function safeText5(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
var MART_PRODUCT_NAME_REPLACEMENTS = [
  [/\bcofee\b/gi, "coffee"],
  [/\bcoffe\b/gi, "coffee"],
  [/\bchoclate\b/gi, "chocolate"],
  [/\bchoclates\b/gi, "chocolates"],
  [/\bbiscut\b/gi, "biscuit"],
  [/\bbiscuts\b/gi, "biscuits"],
  [/\bmasla\b/gi, "masala"],
  [/\bgaram masla\b/gi, "garam masala"],
  [/\bcoriender\b/gi, "coriander"],
  [/\bvegitable\b/gi, "vegetable"],
  [/\bmushrom\b/gi, "mushroom"],
  [/\bnudles\b/gi, "noodles"],
  [/\btoothpast\b/gi, "toothpaste"],
  [/\bdeodrant\b/gi, "deodorant"],
  [/\bmayonise\b/gi, "mayonnaise"],
  [/\bketchap\b/gi, "ketchup"],
  [/\bstrawbery\b/gi, "strawberry"],
  [/\bmangoo\b/gi, "mango"],
  [/\btomatoe\b/gi, "tomato"],
  [/\bpotatoe\b/gi, "potato"]
];
function formatMartProductNameWord(word) {
  const clean = safeText5(word);
  if (!clean) return "";
  const lower = clean.toLowerCase();
  if (["kg", "g", "gm", "mg", "ml", "cm", "mm", "pcs", "pc", "pk", "ltr"].includes(lower)) return lower;
  if (lower === "l") return "L";
  if (/^\d+[a-z]+$/i.test(clean)) {
    const parts = clean.match(/^(\d+)([a-z]+)$/i);
    if (parts) return `${parts[1]}${formatMartProductNameWord(parts[2])}`;
  }
  if (/^[A-Z0-9&+-]{2,6}$/.test(clean)) return clean.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
function normalizeMartProductName(raw) {
  let text = safeText5(raw).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  MART_PRODUCT_NAME_REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text.split(" ").map((word) => formatMartProductNameWord(word)).filter(Boolean).join(" ").replace(/\s+([()/,-])/g, "$1").replace(/([(/-])\s+/g, "$1").trim();
}
function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : fallback;
}
function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}
function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  const text = safeText5(raw);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function hasOwn(row, key) {
  return !!row && typeof row === "object" && Object.prototype.hasOwnProperty.call(row, key);
}
function resolveMenuItemMrpForWrite(rawRow) {
  if (!hasOwn(rawRow, "mrp")) return null;
  const price = parseMoney(rawRow?.price);
  const mrp = parseMoney(rawRow?.mrp);
  if (mrp > 0) return Math.max(mrp, price);
  return deriveMenuItemMrp(price);
}
function normalizeMartProductQuantityOptions(row) {
  const rawOptions = parseJsonArray(row?.quantity_options ?? row?.quantityOptions ?? row?.variants);
  if (!rawOptions.length) return row?.quantity_options ?? row?.quantityOptions ?? row?.variants ?? [];
  const defaultIndex = Math.max(0, rawOptions.findIndex((option) => option?.is_default === true || option?.isDefault === true));
  const hasUnit = hasOwn(row, "unit") || hasOwn(row, "capacity") || hasOwn(row, "size");
  const hasVendorPrice = hasOwn(row, "price") || hasOwn(row, "vendor_price") || hasOwn(row, "vendorPrice");
  const hasCustomerPrice = hasOwn(row, "customer_price") || hasOwn(row, "customerPrice") || hasOwn(row, "selling_price") || hasOwn(row, "sellingPrice");
  const hasMrp = hasOwn(row, "mrp");
  const hasStock = hasOwn(row, "stock");
  return rawOptions.map((option, index) => {
    if (!option || typeof option !== "object") return option;
    if (index !== defaultIndex) return option;
    const nextLabel = safeText5(row?.unit || row?.capacity || row?.size || option?.label || option?.unit || option?.name || "");
    return {
      ...option,
      ...nextLabel ? { label: nextLabel, unit: nextLabel } : {},
      ...hasVendorPrice ? { vendor_price: toMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice, toMoney(option?.vendor_price ?? option?.vendorPrice, 0)) } : {},
      ...hasCustomerPrice ? { price: toMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, toMoney(option?.price, 0)) } : {},
      ...hasMrp ? { mrp: toMoney(row?.mrp, toMoney(option?.mrp, 0)) } : {},
      ...hasStock ? { stock: toInt(row?.stock, toInt(option?.stock, 0)) } : {},
      is_default: true
    };
  });
}
function normalizeMartProductRow(row) {
  if (!row || typeof row !== "object") return row;
  const normalizedVendorId = safeText5(row?.mart_partner_id || row?.martPartnerId || row?.mart_id || row?.martId || "");
  const { martId, martPartnerId, mart_id, ...rest } = row;
  const quantityOptions = normalizeMartProductQuantityOptions(row);
  const defaultQuantityOption = Array.isArray(quantityOptions) ? quantityOptions.find((option) => option?.is_default === true || option?.isDefault === true) || quantityOptions[0] || null : null;
  return {
    ...rest,
    ...normalizedVendorId ? { mart_partner_id: normalizedVendorId } : {},
    name: normalizeMartProductName(row?.name),
    ...defaultQuantityOption ? {
      unit: safeText5(defaultQuantityOption?.label || defaultQuantityOption?.unit || row?.unit || ""),
      price: toMoney(defaultQuantityOption?.vendor_price ?? defaultQuantityOption?.vendorPrice ?? row?.price, toMoney(row?.price, 0)),
      customer_price: toMoney(defaultQuantityOption?.price ?? row?.customer_price ?? row?.customerPrice, toMoney(row?.customer_price ?? row?.customerPrice, 0)),
      mrp: toMoney(defaultQuantityOption?.mrp ?? row?.mrp, toMoney(row?.mrp, 0)),
      stock: toInt(defaultQuantityOption?.stock ?? row?.stock, toInt(row?.stock, 0)),
      quantity_options: quantityOptions
    } : {}
  };
}
function normalizeMenuLookupKey2(name, category) {
  const itemName = safeText5(name).toLowerCase();
  const itemCategory = safeText5(category || "General").toLowerCase();
  return `${itemCategory}::${itemName}`;
}
function slugToken2(v, fallback = "item", maxLen = 32) {
  const s = safeText5(v).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const clipped = s.slice(0, maxLen);
  return clipped || fallback;
}
function makeMenuItemId(vendorName, itemName) {
  const vendor = slugToken2(vendorName, "vendor", 24);
  const item = slugToken2(itemName, "item", 24);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `menu_${vendor}_${item}_${ts}_${rand}`;
}
function normalizeMenuItemUpsertRows(rows, options) {
  const defaultRestaurantId = safeText5(options?.defaultRestaurantId || "");
  const vendorNameByRestaurantId = options?.vendorNameByRestaurantId || /* @__PURE__ */ new Map();
  const dedupedRows = [];
  const indexByKey = /* @__PURE__ */ new Map();
  let generatedIds = 0;
  let deduped = 0;
  (Array.isArray(rows) ? rows : []).forEach((rawRow, idx) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const restaurantId = safeText5(rawRow?.restaurant_id || rawRow?.restaurantId || defaultRestaurantId);
    const itemName = safeText5(rawRow?.name || "");
    const category = safeText5(rawRow?.category || "General") || "General";
    let id = safeText5(rawRow?.id || "");
    if (!id && restaurantId && itemName) {
      const vendorName = safeText5(vendorNameByRestaurantId.get(restaurantId) || restaurantId || "vendor");
      do {
        id = makeMenuItemId(vendorName, itemName);
      } while (indexByKey.has(`id:${id}`));
      generatedIds += 1;
    }
    const resolvedMrp = resolveMenuItemMrpForWrite(rawRow);
    const normalizedRow = {
      ...rawRow,
      ...id ? { id } : {},
      ...restaurantId ? { restaurant_id: restaurantId } : {},
      ...resolvedMrp === null ? {} : { mrp: resolvedMrp }
    };
    const key = id ? `id:${id}` : restaurantId && itemName ? `restaurant:${restaurantId}::${category.toLowerCase()}::${itemName.toLowerCase()}` : `row:${idx}`;
    const existingIdx = indexByKey.get(key);
    if (existingIdx === void 0) {
      indexByKey.set(key, dedupedRows.length);
      dedupedRows.push(normalizedRow);
      return;
    }
    deduped += 1;
    dedupedRows[existingIdx] = {
      ...dedupedRows[existingIdx],
      ...normalizedRow,
      id: safeText5(normalizedRow?.id || dedupedRows[existingIdx]?.id || "")
    };
  });
  return { rows: dedupedRows, generatedIds, deduped };
}
function canonicalMenuItemRow(rawRow, restaurantIdFallback = "") {
  const restaurantId = safeText5(rawRow?.restaurant_id || rawRow?.restaurantId || restaurantIdFallback);
  const image = safeText5(rawRow?.image || rawRow?.hero_image || "");
  return {
    id: safeText5(rawRow?.id || ""),
    restaurant_id: restaurantId,
    category: safeText5(rawRow?.category || "General") || "General",
    name: safeText5(rawRow?.name || ""),
    description: safeText5(rawRow?.description || ""),
    offer: safeText5(rawRow?.offer || ""),
    price: Number(rawRow?.price || 0),
    ...hasOwn(rawRow, "mrp") ? { mrp: resolveMenuItemMrpForWrite(rawRow) ?? 0 } : {},
    image,
    hero_image: image,
    available: rawRow?.available !== false,
    is_veg: rawRow?.is_veg === true || rawRow?.isVeg === true,
    stock: Math.max(0, Number(rawRow?.stock || 0) || 0)
  };
}
async function supabaseAdminUpsertRowsIndividually(table, rows, onConflict = "id") {
  const { url } = assertSupabaseAdminConfigured();
  for (const row of Array.isArray(rows) ? rows : []) {
    const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify([row])
    });
    if (!r.ok) {
      throw new Error(await r.text());
    }
  }
}
async function syncVendorMenuBlobsFromItems(restaurantIds) {
  const ids = Array.from(new Set((restaurantIds || []).map((x) => safeText5(x)).filter(Boolean)));
  if (!ids.length) return;
  const { url } = assertSupabaseAdminConfigured();
  for (const restaurantId of ids) {
    let itemRows = [];
    try {
      itemRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_MENU_ITEM_TABLE2)}?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
      );
    } catch {
      try {
        itemRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_MENU_ITEM_TABLE2)}?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
        );
      } catch {
        itemRows = [];
      }
    }
    const menu = (Array.isArray(itemRows) ? itemRows : []).map((row) => {
      const image = safeText5(row?.image || row?.hero_image || "");
      return {
        id: safeText5(row?.id || ""),
        category: safeText5(row?.category || "General") || "General",
        name: safeText5(row?.name || ""),
        description: safeText5(row?.description || ""),
        offer: safeText5(row?.offer || ""),
        image,
        hero_image: image,
        price: Number(row?.price || 0),
        mrp: Math.max(0, Number(row?.mrp || 0) || 0),
        stock: Math.max(0, Number(row?.stock || 0) || 0),
        available: row?.available !== false,
        isVeg: row?.is_veg === true || row?.isVeg === true,
        is_veg: row?.is_veg === true || row?.isVeg === true
      };
    }).filter((m) => m.name);
    for (const tableName of [FOOD_VENDOR_TABLE2, LEGACY_FOOD_VENDOR_TABLE2]) {
      try {
        const r = await fetch(
          `${url}/rest/v1/${encodeURIComponent(tableName)}?id=eq.${encodeURIComponent(restaurantId)}`,
          {
            method: "PATCH",
            headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
            body: JSON.stringify({ menu })
          }
        );
        if (r.ok) break;
      } catch {
      }
    }
    const vendorMenuRow = [{
      restaurant_id: restaurantId,
      menu,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }];
    for (const tableName of [FOOD_VENDOR_MENU_TABLE2, LEGACY_FOOD_VENDOR_MENU_TABLE2]) {
      try {
        await supabaseAdminDeleteWhere(tableName, { restaurant_id: restaurantId }, "restaurant_id");
        await fetch(`${url}/rest/v1/${encodeURIComponent(tableName)}`, {
          method: "POST",
          headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
          body: JSON.stringify(vendorMenuRow)
        });
      } catch {
      }
    }
  }
}
function encodePath(value) {
  return String(value || "").split("/").map((x) => encodeURIComponent(x)).join("/");
}
function normalizeEmail(email) {
  return safeText5(email).toLowerCase();
}
function normalizePhone2(phone) {
  const raw = safeText5(phone);
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}
function normalizePhoneDigits(v) {
  return safeText5(v).replace(/\D+/g, "");
}
function normalizeDriverPhone(phone) {
  const raw = safeText5(phone).replace(/\s+/g, "");
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}
function normalizeDriverUsername(v) {
  return safeText5(v).toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}
function normalizeDashboardUsername(v) {
  return safeText5(v).toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}
function comparePlain(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  try {
    return import_crypto.default.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}
function verifyDashboardPassword(password, storedHash) {
  const text = safeText5(storedHash);
  if (!text) return false;
  if (text.startsWith("sha256$")) {
    const expectedHex = text.slice("sha256$".length);
    const digest = import_crypto.default.createHash("sha256").update(password).digest("hex");
    return comparePlain(digest, expectedHex);
  }
  if (text.startsWith("scrypt$")) {
    const parts = text.split("$");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expected = parts[2];
    const candidate = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
    return comparePlain(candidate, expected);
  }
  return comparePlain(password, text);
}
function hashDriverPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
function supabaseUrl4() {
  return process.env.SUPABASE_URL || "";
}
function supabaseAnonKey2() {
  return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
}
function jwtSecret() {
  return getJwtSecret();
}
function allowedAdminEmail() {
  return normalizeEmail(getAdminAllowedEmail());
}
var ADMIN_SESSION_COOKIE = "ev_admin_session";
var ADMIN_PREAUTH_COOKIE = "ev_admin_google_preauth";
var DEFAULT_DASHBOARD_USERNAME = "";
var DEFAULT_DASHBOARD_PASSWORD = "";
var ENV_DEFAULT_DASHBOARD_USERNAME = safeText5(process.env.DASHBOARD_DEFAULT_USERNAME || DEFAULT_DASHBOARD_USERNAME).toLowerCase();
var ENV_DEFAULT_DASHBOARD_PASSWORD = safeText5(process.env.DASHBOARD_DEFAULT_PASSWORD || DEFAULT_DASHBOARD_PASSWORD);
function normalizeDashboardScope(v) {
  const raw = safeText5(v).toLowerCase();
  if (raw === "admin" || raw === "all") return "admin";
  if (raw === "food") return "food";
  if (raw === "support" || raw === "customer_support" || raw === "customer-support") return "support";
  return "travel";
}
function rawDashboardScopeFromReq(req) {
  const headerScope = safeText5(req?.headers?.["x-ev-dashboard"] || req?.headers?.["X-EV-Dashboard"]);
  const bodyScope = safeText5(req?.body?.dashboard || "");
  const queryScope = safeText5(req?.query?.dashboard || "");
  return headerScope || bodyScope || queryScope;
}
function dashboardScopeFromReq(req) {
  return normalizeDashboardScope(rawDashboardScopeFromReq(req));
}
function declaredDashboardScope(req) {
  const raw = rawDashboardScopeFromReq(req);
  return raw ? normalizeDashboardScope(raw) : null;
}
function expectedDashboardKey(scope) {
  const adminKey = safeText5(process.env.ADMIN_DASHBOARD_KEY || "");
  if (scope === "admin") return adminKey;
  if (scope === "food") return safeText5(process.env.FOOD_DASHBOARD_KEY || adminKey);
  if (scope === "support") return safeText5(process.env.CUSTOMER_SUPPORT_DASHBOARD_KEY || adminKey);
  return safeText5(process.env.TRAVEL_DASHBOARD_KEY || adminKey);
}
function matchesDefaultDashboardCredentials(username, password) {
  if (!ENV_DEFAULT_DASHBOARD_USERNAME || !ENV_DEFAULT_DASHBOARD_PASSWORD) return false;
  if (!safeText5(username) || !safeText5(password)) return false;
  return normalizeDashboardUsername(username) === ENV_DEFAULT_DASHBOARD_USERNAME && comparePlain(password, ENV_DEFAULT_DASHBOARD_PASSWORD);
}
function dashboardCredentialColumns(scope) {
  if (scope === "admin") return { user: "ev_admin_user", password: "ev_admin_password" };
  if (scope === "food") return { user: "ev_food_user", password: "ev_food_password" };
  if (scope === "support") return { user: "ev_support_user", password: "ev_support_password" };
  return { user: "ev_tours_user", password: "ev_tours_password" };
}
async function fetchDashboardCredentials(scope) {
  const url = safeText5(supabaseUrl4()).replace(/\/+$/, "");
  const key = safeText5(supabaseServiceRoleKey3());
  if (!url || !key) return null;
  try {
    const cols = dashboardCredentialColumns(scope);
    const endpoint = `${url}/rest/v1/ev_dashboards?id=eq.main&select=${encodeURIComponent(`${cols.user},${cols.password}`)}&limit=1`;
    const r = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    const username = safeText5(row?.[cols.user]).toLowerCase();
    const password = safeText5(row?.[cols.password]);
    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}
function normalizeUiPath(p) {
  const v = safeText5(p);
  if (!v) return "/";
  return v.startsWith("/") ? v : `/${v}`;
}
function requestOrigin(req) {
  const protoRaw = safeText5(req?.headers?.["x-forwarded-proto"] || req?.protocol || "http");
  const proto = protoRaw.split(",")[0].trim() || "http";
  const host = safeText5(req?.headers?.["x-forwarded-host"] || req?.headers?.host || "");
  return host ? `${proto}://${host}` : "";
}
function defaultDashboardControls() {
  return {
    platformEnabled: true,
    forceOpsPage: false,
    opsPageOnError: true,
    opsMessage: "Ops! Service temporarily unavailable. Please try again shortly.",
    appTabs: {
      travel: true,
      taxi: true,
      bike: true,
      food: true,
      mart: true,
      services: true
    },
    vendorDashboards: {
      admin: true,
      travel: true,
      food: true,
      support: true,
      mart_vendor: true
    }
  };
}
function normalizeDashboardControls(raw) {
  const d = defaultDashboardControls();
  const src = raw && typeof raw === "object" ? raw : {};
  const appTabs = src.appTabs && typeof src.appTabs === "object" ? src.appTabs : {};
  const vendorDashboards = src.vendorDashboards && typeof src.vendorDashboards === "object" ? src.vendorDashboards : {};
  return {
    platformEnabled: src.platformEnabled !== false,
    forceOpsPage: src.forceOpsPage === true,
    opsPageOnError: src.opsPageOnError !== false,
    opsMessage: safeText5(src.opsMessage) || d.opsMessage,
    appTabs: {
      travel: appTabs.travel !== false,
      taxi: appTabs.taxi !== false,
      bike: appTabs.bike !== false,
      food: appTabs.food !== false,
      mart: appTabs.mart !== false,
      services: appTabs.services !== false
    },
    vendorDashboards: {
      admin: vendorDashboards.admin !== false,
      travel: vendorDashboards.travel !== false,
      food: vendorDashboards.food !== false,
      support: vendorDashboards.support !== false,
      mart_vendor: vendorDashboards.mart_vendor !== false
    }
  };
}
function scopeToggleKey(scope) {
  if (scope === "admin") return "admin";
  if (scope === "food") return "food";
  if (scope === "support") return "support";
  return "travel";
}
async function fetchDashboardControls() {
  const fallback = defaultDashboardControls();
  const url = safeText5(supabaseUrl4()).replace(/\/+$/, "");
  const key = supabaseServiceRoleKey3();
  if (!url || !key) return fallback;
  try {
    const endpoint = `${url}/rest/v1/ev_settings?id=eq.main&select=tax_rules&limit=1`;
    const r = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    if (!r.ok) return fallback;
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    const taxRules = row?.tax_rules && typeof row.tax_rules === "object" ? row.tax_rules : {};
    const raw = taxRules.dashboardControls || taxRules.dashboard_controls || {};
    return normalizeDashboardControls(raw);
  } catch {
    return fallback;
  }
}
async function assertDashboardEnabled(scope) {
  const controls = await fetchDashboardControls();
  if (controls.platformEnabled === false) {
    return { ok: false, code: "PLATFORM_DISABLED", controls };
  }
  const key = scopeToggleKey(scope);
  const enabled = controls?.vendorDashboards && typeof controls.vendorDashboards === "object" ? controls.vendorDashboards[key] !== false : true;
  if (!enabled) return { ok: false, code: "DASHBOARD_DISABLED", controls };
  return { ok: true, controls };
}
function parseCookies(cookieHeader) {
  const out = {};
  const raw = safeText5(cookieHeader);
  if (!raw) return out;
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = decodeURIComponent(v);
  });
  return out;
}
function getBearerToken(req) {
  const auth = safeText5(req?.headers?.authorization || req?.headers?.Authorization || "");
  if (!auth) return "";
  const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? safeText5(m[1]) : "";
}
function getAdminSessionToken(req) {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  return safeText5(cookies[ADMIN_SESSION_COOKIE] || "");
}
function verifyAdminSession(req) {
  const token = getAdminSessionToken(req);
  if (!token) return null;
  try {
    const payload = import_jsonwebtoken2.default.verify(token, jwtSecret());
    if (!payload || payload.role !== "admin") return null;
    const authMode = safeText5(payload.authMode || "");
    if (authMode === "dashboard_credentials") {
      const username = normalizeDashboardUsername(payload.username || payload.sub || "");
      if (!username) return null;
      payload.username = username;
    } else {
      const email = normalizeEmail(payload.email || "");
      if (!email || email !== allowedAdminEmail()) return null;
    }
    if (payload.keyOk !== true) return null;
    const scopesRaw = Array.isArray(payload.scopes) ? payload.scopes : [];
    const scopes = scopesRaw.map((x) => normalizeDashboardScope(x)).filter((x, i, arr) => arr.indexOf(x) === i);
    if (!scopes.length) scopes.push("travel");
    payload.scopes = scopes;
    return payload;
  } catch {
    return null;
  }
}
async function fetchDashboardCredential(scope, username) {
  const normalizedUsername = normalizeDashboardUsername(username);
  if (!normalizedUsername) return null;
  try {
    const rows = await supabaseAdminFetchJson(
      `/rest/v1/ev_dashboard_credentials?select=id,username,password_hash,password,scope,dashboard,active,is_active&username=eq.${encodeURIComponent(normalizedUsername)}&limit=20`
    );
    const list = Array.isArray(rows) ? rows : [];
    const hit = list.find((row) => {
      const rowScope = normalizeDashboardScope(row?.dashboard || row?.scope || "travel");
      const rowUsername = normalizeDashboardUsername(row?.username || "");
      const active = row?.is_active !== false && row?.active !== false;
      return active && rowScope === scope && rowUsername === normalizedUsername;
    });
    return hit || null;
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      throw new Error("DASHBOARD_CREDENTIALS_TABLE_MISSING");
    }
    throw err;
  }
}
function isHttpsRequest(req) {
  if (req?.secure) return true;
  const xfProto = safeText5(req?.headers?.["x-forwarded-proto"] || req?.headers?.["X-Forwarded-Proto"] || "").toLowerCase();
  if (!xfProto) return false;
  return xfProto.split(",").map((x) => x.trim()).includes("https");
}
async function getSupabaseUser(accessToken) {
  const url = supabaseUrl4();
  const anon = supabaseAnonKey2();
  if (!url || !anon) throw new Error("SUPABASE_NOT_CONFIGURED");
  const r = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
function isGoogleUser(user) {
  const appProvider = safeText5(user?.app_metadata?.provider || "").toLowerCase();
  if (appProvider === "google") return true;
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.some((x) => safeText5(x?.provider || "").toLowerCase() === "google");
}
async function adminAuth(req, res, next) {
  const ok = verifyAdminSession(req);
  if (!ok) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
  const scopes = Array.isArray(ok?.scopes) ? ok.scopes.map((x) => normalizeDashboardScope(x)) : ["travel"];
  const declared = declaredDashboardScope(req);
  const requestedScope = declared || (scopes.includes("admin") ? "admin" : scopes[0] || "travel");
  if (!scopes.includes(requestedScope)) {
    return res.status(403).json({ error: "DASHBOARD_ACCESS_DENIED", dashboard: requestedScope });
  }
  const gate = await assertDashboardEnabled(requestedScope);
  if (!gate.ok) {
    return res.status(503).json({
      error: gate.code,
      dashboard: requestedScope,
      controls: gate.controls
    });
  }
  req.dashboard = requestedScope;
  req.admin = ok;
  req.dashboardControls = gate.controls;
  next();
}
function requireAdminDashboardScope(req, res) {
  const requestedScope = dashboardScopeFromReq(req);
  if (requestedScope !== "admin") {
    res.status(403).json({ error: "ADMIN_SCOPE_REQUIRED" });
    return false;
  }
  return true;
}
function hashDashboardPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
async function readDashboardCredentialRows(scope) {
  const whereScope = scope ? `&scope=eq.${encodeURIComponent(scope)}` : "";
  const rows = await supabaseAdminFetchJson(
    `/rest/v1/ev_dashboard_credentials?select=id,scope,dashboard,username,is_active,active,created_at,updated_at${whereScope}&order=updated_at.desc.nullslast&limit=500`
  );
  return Array.isArray(rows) ? rows : [];
}
var adminRouter = (0, import_express.Router)();
adminRouter.get("/google/config", (_req, res) => {
  const url = supabaseUrl4().replace(/\/+$/, "");
  const anon = supabaseAnonKey2();
  if (!url || !anon) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });
  return res.json({ supabaseUrl: url, supabaseAnonKey: anon });
});
adminRouter.post("/google/verify", async (req, res) => {
  const accessToken = safeText5(req?.body?.supabaseAccessToken || "");
  if (!accessToken) return res.status(400).json({ error: "SUPABASE_ACCESS_TOKEN_REQUIRED" });
  try {
    const secureCookie = isHttpsRequest(req);
    const user = await getSupabaseUser(accessToken);
    const email = normalizeEmail(user?.email || "");
    if (!email || email !== allowedAdminEmail()) {
      return res.status(403).json({ error: "ADMIN_EMAIL_NOT_ALLOWED" });
    }
    if (!isGoogleUser(user)) {
      return res.status(403).json({ error: "GOOGLE_SIGNIN_REQUIRED" });
    }
    const preauthToken = import_jsonwebtoken2.default.sign(
      { sub: safeText5(user?.id || email), role: "admin_google_preauth", email, googleOk: true },
      jwtSecret(),
      { expiresIn: "10m" }
    );
    res.cookie(ADMIN_PREAUTH_COOKIE, preauthToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 10 * 60 * 1e3
    });
    return res.json({ ok: true, email, googleVerified: true });
  } catch (e) {
    return res.status(401).json({ error: "SUPABASE_SESSION_INVALID", message: String(e?.message || e) });
  }
});
adminRouter.post("/email/verify", async (req, res) => {
  const email = normalizeEmail(req?.body?.email || "");
  if (!email) return res.status(400).json({ error: "EMAIL_REQUIRED" });
  if (email !== allowedAdminEmail()) {
    return res.status(403).json({ error: "ADMIN_EMAIL_NOT_ALLOWED" });
  }
  const secureCookie = isHttpsRequest(req);
  const preauthToken = import_jsonwebtoken2.default.sign(
    { sub: email, role: "admin_email_preauth", email, emailOk: true },
    jwtSecret(),
    { expiresIn: "10m" }
  );
  res.cookie(ADMIN_PREAUTH_COOKIE, preauthToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 10 * 60 * 1e3
  });
  return res.json({ ok: true, email, emailVerified: true });
});
adminRouter.post("/login", async (req, res) => {
  const scope = dashboardScopeFromReq(req);
  const adminKey = safeText5(req?.body?.adminKey || "");
  const username = safeText5(req?.body?.username || "").toLowerCase();
  const password = safeText5(req?.body?.password || "");
  let principal = null;
  if (username && password && matchesDefaultDashboardCredentials(username, password)) {
    principal = {
      sub: `dashboard:${scope}:${ENV_DEFAULT_DASHBOARD_USERNAME}`,
      email: allowedAdminEmail(),
      username: ENV_DEFAULT_DASHBOARD_USERNAME,
      authMode: "dashboard_credentials"
    };
  }
  const tableCredentials = await fetchDashboardCredentials(scope);
  if (!principal && tableCredentials) {
    if (username && password && username === tableCredentials.username && password === tableCredentials.password) {
      principal = {
        sub: `dashboard:${scope}:${username}`,
        email: allowedAdminEmail(),
        username,
        authMode: "dashboard_credentials"
      };
    }
  }
  if (!principal && username && password) {
    let account = null;
    try {
      account = await fetchDashboardCredential(scope, username);
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.includes("DASHBOARD_CREDENTIALS_TABLE_MISSING")) {
        account = null;
      } else {
        return res.status(500).json({ error: "CREDENTIAL_LOOKUP_FAILED", dashboard: scope, message: msg });
      }
    }
    const storedHash = safeText5(account?.password_hash || account?.password || "");
    if (account && verifyDashboardPassword(password, storedHash)) {
      principal = {
        sub: `${scope}:${normalizeDashboardUsername(account?.username || username)}`,
        email: allowedAdminEmail(),
        username: normalizeDashboardUsername(account?.username || username),
        authMode: "dashboard_credentials"
      };
    }
  }
  if (!principal) {
    if (scope === "food") {
      return res.status(401).json({ error: "PASSWORD_LOGIN_REQUIRED" });
    }
    const expected = expectedDashboardKey(scope);
    if (!expected && !ENV_DEFAULT_DASHBOARD_PASSWORD) {
      return res.status(500).json({ error: "DASHBOARD_KEY_NOT_CONFIGURED", dashboard: scope });
    }
    const supplied = password || adminKey;
    const secretOk = !!expected && comparePlain(supplied, expected) || comparePlain(supplied, ENV_DEFAULT_DASHBOARD_PASSWORD);
    if (!supplied || !secretOk) return res.status(401).json({ error: "INVALID_SECRET_KEY" });
    principal = {
      sub: `dashboard:${scope}:${username || ENV_DEFAULT_DASHBOARD_USERNAME}`,
      email: allowedAdminEmail(),
      username: username || ENV_DEFAULT_DASHBOARD_USERNAME,
      authMode: "dashboard_credentials"
    };
  }
  const existing = verifyAdminSession(req);
  const gate = await assertDashboardEnabled(scope);
  if (!gate.ok) {
    return res.status(503).json({
      error: gate.code,
      dashboard: scope,
      controls: gate.controls
    });
  }
  const prevScopes = Array.isArray(existing?.scopes) ? existing.scopes.map((x) => normalizeDashboardScope(x)) : [];
  const scopes = Array.from(/* @__PURE__ */ new Set([...prevScopes, scope]));
  const token = import_jsonwebtoken2.default.sign(
    {
      sub: safeText5(principal.sub || principal.email),
      role: "admin",
      email: normalizeEmail(principal.email || ""),
      username: safeText5(principal.username || ""),
      authMode: safeText5(principal.authMode || ""),
      keyOk: true,
      googleOk: principal.googleOk === true,
      emailOk: principal.emailOk === true,
      scopes
    },
    jwtSecret(),
    { expiresIn: "12h" }
  );
  const secureCookie = isHttpsRequest(req);
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 12 * 60 * 60 * 1e3
  });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  return res.json({ ok: true, email: normalizeEmail(principal.email || ""), dashboard: scope, scopes, username: safeText5(principal.username || "") });
});
adminRouter.get("/whoami", async (req, res) => {
  const s = verifyAdminSession(req);
  if (!s) return res.status(401).json({ ok: false });
  const requestedScope = dashboardScopeFromReq(req);
  const scopes = Array.isArray(s?.scopes) ? s.scopes.map((x) => normalizeDashboardScope(x)) : ["travel"];
  if (requestedScope && !scopes.includes(requestedScope)) {
    return res.status(403).json({ ok: false, error: "DASHBOARD_ACCESS_DENIED", dashboard: requestedScope, scopes });
  }
  try {
    const gate = await assertDashboardEnabled(requestedScope || "travel");
    if (!gate.ok) {
      return res.status(503).json({
        ok: false,
        error: gate.code,
        dashboard: requestedScope || "travel",
        controls: gate.controls,
        scopes
      });
    }
    return res.json({
      ok: true,
      email: normalizeEmail(s.email || ""),
      username: safeText5(s.username || ""),
      sub: safeText5(s.sub || ""),
      scopes,
      controls: gate.controls
    });
  } catch {
    return res.json({
      ok: true,
      email: normalizeEmail(s.email || ""),
      username: safeText5(s.username || ""),
      sub: safeText5(s.sub || ""),
      scopes
    });
  }
});
adminRouter.post("/logout", (req, res) => {
  const secureCookie = isHttpsRequest(req);
  res.cookie(ADMIN_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  return res.json({ ok: true });
});
adminRouter.get("/invoices/customer/transaction/:table/:transactionId/pdf", requireAuth, async (req, res) => {
  try {
    const table = normalizeInvoiceTransactionTable(req.params.table);
    const transactionId = safeText5(req.params.transactionId);
    const download = safeText5(req.query.download || "").toLowerCase();
    if (!INVOICE_TRANSACTION_TABLES.has(table)) {
      return res.status(400).json({ error: "INVALID_TRANSACTION_TABLE" });
    }
    if (!transactionId) return res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });
    const transaction = await fetchTransactionRow(table, transactionId);
    if (!transaction) return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
    const claims = getAuthClaims(req);
    const claimSub = safeText5(claims?.sub);
    const claimEmail = normalizeEmail(claims?.email || "");
    const claimPhone = normalizePhoneDigits(claims?.phone || "");
    const rowUserId = safeText5(transaction?.user_id || transaction?.userId || "");
    const rowEmail = normalizeEmail(transaction?.email || "");
    const rowPhone = normalizePhoneDigits(transaction?.phone || "");
    const ownerOk = claimSub && rowUserId && claimSub === rowUserId || claimEmail && rowEmail && claimEmail === rowEmail || claimPhone && rowPhone && claimPhone === rowPhone;
    if (!ownerOk) return res.status(403).json({ error: "INVOICE_ACCESS_DENIED" });
    if (table === "ev_cab_bookings") {
      const paid = safeText5(transaction?.payment_status || transaction?.paymentStatus).toLowerCase() === "paid";
      if (!paid) return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_UNPAID" });
    }
    if (isCancelledTransaction(transaction)) {
      return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_CANCELLED" });
    }
    const serviceKey = serviceKeyForTable(table, transaction);
    let invoiceProfile = defaultInvoiceProfile();
    try {
      invoiceProfile = await fetchInvoiceProfileConfig();
    } catch {
      invoiceProfile = defaultInvoiceProfile();
    }
    const vendorDetails = await fetchVendorDetailsForTransaction(table, transaction, invoiceProfile);
    const sellerProfile = mergeSellerProfile(invoiceProfile, serviceKey, vendorDetails);
    const serviceName = transactionServiceName(table, transaction);
    const gstPercent = parseAmount(
      sellerProfile?.gstPercent ?? sellerProfile?.defaultGstPercent ?? invoiceProfile?.defaultGstPercent ?? 5
    );
    const defaultHsn = safeText5(
      sellerProfile?.defaultHsnOrSac || invoiceProfile?.defaultHsnOrSac || "9964"
    );
    const items = normalizeInvoiceItems(table, transaction, serviceName, defaultHsn, gstPercent);
    let invoice = null;
    try {
      invoice = await fetchInvoiceByTransaction(table, transactionId);
    } catch (err) {
      if (!isMissingInvoicesTableError(err)) throw err;
    }
    if (!invoice) {
      try {
        await ensureInvoiceForCompletedTransaction({
          table,
          row: transaction,
          source: "customer_invoice_pdf"
        });
      } catch {
      }
      try {
        invoice = await fetchInvoiceByTransaction(table, transactionId);
      } catch (err) {
        if (!isMissingInvoicesTableError(err)) throw err;
      }
    }
    if (!invoice) {
      invoice = fallbackInvoiceFromTransaction(table, transaction);
    }
    const pdf = await buildInvoicePdfBuffer(invoice, transaction, {
      sellerProfile,
      serviceName,
      items,
      placeOfSupply: safeText5(sellerProfile?.placeOfSupply || "")
    });
    const invoiceNo = safeText5(invoice?.invoice_no || invoice?.id || "invoice");
    const filename = `${invoiceNo}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const disposition = download === "1" || download === "true" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdf);
  } catch (err) {
    return res.status(500).json({
      error: "INVOICE_PDF_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.use(adminAuth);
adminRouter.post("/push-notifications/send", async (req, res) => {
  const dashboardScope = normalizeDashboardScope(req?.dashboard || "");
  if (!(dashboardScope === "admin" || dashboardScope === "support")) {
    return res.status(403).json({ error: "PUSH_SEND_SCOPE_REQUIRED" });
  }
  const parsed = import_zod2.z.object({
    title: import_zod2.z.string().trim().min(1).max(120),
    message: import_zod2.z.string().trim().min(1).max(500),
    type: import_zod2.z.string().trim().max(40).optional(),
    target: import_zod2.z.enum(["all", "users", "phones", "emails"]).default("all"),
    userIds: import_zod2.z.array(import_zod2.z.string().trim().min(1)).max(1e3).optional(),
    phones: import_zod2.z.array(import_zod2.z.string().trim().min(6)).max(1e3).optional(),
    emails: import_zod2.z.array(import_zod2.z.string().trim().email()).max(1e3).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const payload = parsed.data;
  const normalizedUserIds = new Set((payload.userIds || []).map((x) => safeText5(x)).filter(Boolean));
  const normalizedPhones = new Set((payload.phones || []).map((x) => normalizePhone2(x)).filter(Boolean));
  const normalizedEmails = new Set((payload.emails || []).map((x) => normalizeEmail(x)).filter(Boolean));
  if (payload.target === "users" && !normalizedUserIds.size) {
    return res.status(400).json({ error: "USER_IDS_REQUIRED" });
  }
  if (payload.target === "phones" && !normalizedPhones.size) {
    return res.status(400).json({ error: "PHONES_REQUIRED" });
  }
  if (payload.target === "emails" && !normalizedEmails.size) {
    return res.status(400).json({ error: "EMAILS_REQUIRED" });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let sentCount = 0;
  let totalUsers = 0;
  await mutateData((draft) => {
    if (!Array.isArray(draft.userProfiles)) draft.userProfiles = [];
    const profiles = draft.userProfiles;
    totalUsers = profiles.length;
    profiles.forEach((profile) => {
      const id = safeText5(profile?.id || "");
      const phone = normalizePhone2(safeText5(profile?.phone || ""));
      const email = normalizeEmail(safeText5(profile?.email || ""));
      let matched = false;
      if (payload.target === "all") matched = true;
      else if (payload.target === "users") matched = !!id && normalizedUserIds.has(id);
      else if (payload.target === "phones") matched = !!phone && normalizedPhones.has(phone);
      else if (payload.target === "emails") matched = !!email && normalizedEmails.has(email);
      if (!matched) return;
      const current = Array.isArray(profile.pushNotifications) ? profile.pushNotifications : [];
      const nextEntry = {
        id: makeId("push"),
        title: payload.title,
        message: payload.message,
        type: safeText5(payload.type || "general") || "general",
        createdAt: nowIso,
        from: safeText5(req?.admin?.email || "") || "admin"
      };
      profile.pushNotifications = [nextEntry, ...current].slice(0, 200);
      profile.updatedAt = nowIso;
      sentCount += 1;
    });
  }, "admin_send_push_notifications");
  return res.json({
    ok: true,
    sentCount,
    totalUsers,
    target: payload.target
  });
});
adminRouter.get("/dashboard-users", async (req, res) => {
  if (!requireAdminDashboardScope(req, res)) return;
  const scope = normalizeDashboardScope(req.query?.scope || "travel");
  try {
    const rows = await readDashboardCredentialRows(scope);
    const users = rows.map((row) => ({
      id: safeText5(row?.id || ""),
      scope: normalizeDashboardScope(row?.dashboard || row?.scope || "travel"),
      username: normalizeDashboardUsername(row?.username || ""),
      active: row?.is_active !== false && row?.active !== false,
      createdAt: safeText5(row?.created_at || ""),
      updatedAt: safeText5(row?.updated_at || "")
    })).filter((x) => x.id && x.username);
    return res.json({ ok: true, users });
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      return res.status(500).json({ error: "DASHBOARD_CREDENTIALS_TABLE_MISSING" });
    }
    return res.status(500).json({ error: "DASHBOARD_USERS_FETCH_FAILED", message: msg });
  }
});
adminRouter.post("/dashboard-users", async (req, res) => {
  if (!requireAdminDashboardScope(req, res)) return;
  const scope = normalizeDashboardScope(req.body?.scope || "travel");
  const username = normalizeDashboardUsername(req.body?.username || "");
  const password = safeText5(req.body?.password || "");
  const active = req.body?.active !== false;
  if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
  if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
  if (password.length < 8) return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
  const passwordHash = hashDashboardPassword(password);
  try {
    const existingRows = await supabaseAdminFetchJson(
      `/rest/v1/ev_dashboard_credentials?select=id,scope,dashboard,username&scope=eq.${encodeURIComponent(scope)}&username=eq.${encodeURIComponent(username)}&limit=1`
    );
    const existing = Array.isArray(existingRows) && existingRows[0] ? existingRows[0] : null;
    const { url } = assertSupabaseAdminConfigured();
    if (existing?.id) {
      const endpoint2 = `${url}/rest/v1/ev_dashboard_credentials?id=eq.${encodeURIComponent(safeText5(existing.id))}`;
      const r2 = await fetch(endpoint2, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify({
          scope,
          dashboard: scope,
          username,
          password_hash: passwordHash,
          is_active: !!active,
          active: !!active
        })
      });
      if (!r2.ok) return res.status(500).json({ error: "DASHBOARD_USER_UPDATE_FAILED", message: await r2.text() });
      const out2 = await r2.json().catch(() => []);
      const row2 = Array.isArray(out2) ? out2[0] : out2;
      return res.json({
        ok: true,
        user: {
          id: safeText5(row2?.id || existing.id),
          scope,
          username,
          active: row2?.is_active !== false && row2?.active !== false
        }
      });
    }
    const endpoint = `${url}/rest/v1/ev_dashboard_credentials`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify([{
        scope,
        dashboard: scope,
        username,
        password_hash: passwordHash,
        is_active: !!active,
        active: !!active
      }])
    });
    if (!r.ok) return res.status(500).json({ error: "DASHBOARD_USER_CREATE_FAILED", message: await r.text() });
    const out = await r.json().catch(() => []);
    const row = Array.isArray(out) ? out[0] : out;
    return res.json({
      ok: true,
      user: {
        id: safeText5(row?.id || ""),
        scope,
        username,
        active: row?.is_active !== false && row?.active !== false
      }
    });
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      return res.status(500).json({ error: "DASHBOARD_CREDENTIALS_TABLE_MISSING" });
    }
    return res.status(500).json({ error: "DASHBOARD_USER_SAVE_FAILED", message: msg });
  }
});
adminRouter.get("/bots/status", (_req, res) => {
  const rawMode = String(process.env.TELEGRAM_MODE || "").trim().toLowerCase();
  const mode = rawMode === "on" || rawMode === "true" || rawMode === "1" ? "polling" : rawMode || "off";
  const webhookBase = (process.env.TELEGRAM_WEBHOOK_BASE_URL || "").trim();
  const webhookSecretSet = Boolean((process.env.TELEGRAM_WEBHOOK_SECRET || "").trim());
  const botSuffix = webhookSecretSet ? "/<secret>" : "";
  const bots = {
    admin: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    support: Boolean(process.env.TELEGRAM_SUPPORT_BOT_TOKEN),
    sales: Boolean(process.env.TELEGRAM_SALES_BOT_TOKEN),
    ops: Boolean(process.env.TELEGRAM_OPS_BOT_TOKEN),
    finance: Boolean(process.env.TELEGRAM_FINANCE_BOT_TOKEN)
  };
  const agentModel = (process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini").trim();
  const transcribeModel = (process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1").trim();
  return res.json({
    mode,
    webhookBase,
    webhookSecretSet,
    bots,
    agentModel,
    transcribeModel,
    webhookPaths: {
      admin: `/telegram/admin${botSuffix}`,
      support: `/telegram/support${botSuffix}`,
      sales: `/telegram/sales${botSuffix}`,
      ops: `/telegram/ops${botSuffix}`,
      finance: `/telegram/finance${botSuffix}`
    }
  });
});
adminRouter.get("/ui/paths", (req, res) => {
  const adminPath = normalizeUiPath(
    process.env.ADMIN_UI_PATH || "/_ev_console_x9k2p7_9b3f21a7c4d8e0f6a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9"
  );
  const travelPath = normalizeUiPath(process.env.TRAVEL_UI_PATH || `${adminPath}/travel`);
  const foodPath = normalizeUiPath(process.env.MART_UI_PATH || process.env.FOOD_UI_PATH || `${adminPath}/food`);
  const supportPath = normalizeUiPath(process.env.SUPPORT_UI_PATH || `${adminPath}/support`);
  const martVendorPath = normalizeUiPath(
    process.env.MARTVENDOR_UI_PATH || process.env.MART_VENDOR_UI_PATH || process.env.EXPO_PUBLIC_MARTVENDOR_UI_PATH || `${adminPath}/mart-vendor`
  );
  const driverPath = normalizeUiPath(process.env.DRIVER_UI_PATH || "/driver");
  const foodVendorPath = normalizeUiPath(process.env.FOOD_VENDOR_UI_PATH || "/restaurant-vendor");
  const origin = requestOrigin(req);
  const absolute = {
    admin: origin ? `${origin}${adminPath}` : adminPath,
    travel: origin ? `${origin}${travelPath}` : travelPath,
    food: origin ? `${origin}${foodPath}` : foodPath,
    support: origin ? `${origin}${supportPath}` : supportPath,
    mart_vendor: origin ? `${origin}${martVendorPath}` : martVendorPath,
    driver: origin ? `${origin}${driverPath}` : driverPath,
    food_vendor: origin ? `${origin}${foodVendorPath}` : foodVendorPath
  };
  return res.json({
    origin,
    relative: {
      admin: adminPath,
      travel: travelPath,
      food: foodPath,
      support: supportPath,
      mart_vendor: martVendorPath,
      driver: driverPath,
      food_vendor: foodVendorPath
    },
    absolute
  });
});
function supabaseServiceRoleKey3() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}
function getAiClient() {
  const openAiKey = safeText5(process.env.OPENAI_API_KEY || "");
  const openRouterKey = safeText5(process.env.OpenRouter_key || process.env.OPENROUTER_KEY || "");
  if (openRouterKey) {
    return new import_openai.default({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1"
    });
  }
  if (openAiKey) return new import_openai.default({ apiKey: openAiKey });
  return null;
}
function sanitizeAiPatch(raw, template) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const allowed = new Set(Object.keys(template || {}));
  Object.keys(raw).forEach((k) => {
    if (!allowed.has(k)) return;
    out[k] = raw[k];
  });
  return out;
}
function assertSupabaseAdminConfigured() {
  const url = supabaseUrl4().replace(/\/+$/, "");
  const key = supabaseServiceRoleKey3();
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}
function supabaseAdminHeaders(extra) {
  const { key } = assertSupabaseAdminConfigured();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra || {}
  };
}
function isMissingRelationErrorMessage(message, table) {
  const text = safeText5(message).toLowerCase();
  const tableName = safeText5(table).toLowerCase();
  return !!text && !!tableName && ((text.includes("does not exist") || text.includes("could not find the table")) && text.includes(tableName));
}
function fallbackTableForRequestedTable(table) {
  if (table === FOOD_VENDOR_TABLE2) return LEGACY_FOOD_VENDOR_TABLE2;
  if (table === FOOD_MENU_ITEM_TABLE2) return LEGACY_FOOD_MENU_ITEM_TABLE2;
  if (table === FOOD_VENDOR_MENU_TABLE2) return LEGACY_FOOD_VENDOR_MENU_TABLE2;
  return "";
}
function normalizeUploadFolder(raw, fallback = "admin") {
  const folder = String(raw || fallback).replace(/[^a-zA-Z0-9/_-]/g, "");
  return folder || fallback;
}
function sanitizeFileBaseName(rawName) {
  const input = safeText5(rawName);
  const noExt = input.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = noExt.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_\-.]+|[_\-.]+$/g, "");
  return cleaned || `upload_${Date.now()}`;
}
function makeUploadFileName(mimeType, originalName) {
  const baseName = sanitizeFileBaseName(originalName);
  const isPng = safeText5(mimeType).toLowerCase() === "image/png";
  const ext = isPng ? "png" : "jpg";
  return { baseName, isPng, ext, filename: `${baseName}.${ext}` };
}
async function normalizeUploadImage(buffer, mimeType) {
  const { isPng } = makeUploadFileName(mimeType);
  if (isPng) {
    return {
      contentType: "image/png",
      body: await (0, import_sharp.default)(buffer).rotate().png({ compressionLevel: 9 }).toBuffer()
    };
  }
  return {
    contentType: "image/jpeg",
    body: await (0, import_sharp.default)(buffer).rotate().jpeg({ quality: 85 }).toBuffer()
  };
}
function getSupabaseStorageConfig() {
  const supabaseUrlRaw = safeText5(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseKey = safeText5(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
  const supabaseBucket = safeText5(process.env.SUPABASE_STORAGE_BUCKET || "");
  if (!supabaseUrlRaw || !supabaseKey || !supabaseBucket) {
    throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  }
  return { supabaseUrlRaw, supabaseKey, supabaseBucket };
}
async function uploadImageBufferToSupabase(buffer, mimeType, folderRaw, originalName) {
  const folder = normalizeUploadFolder(folderRaw, "admin");
  const { baseName, ext } = makeUploadFileName(mimeType, originalName);
  const { contentType, body } = await normalizeUploadImage(buffer, mimeType);
  const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
  let objectPath = "";
  let uploaded = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const filename = `${baseName}${suffix}.${ext}`;
    objectPath = import_path4.default.join(folder, filename).replace(/\\/g, "/");
    const uploadUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": contentType
      },
      body
    });
    if (uploadResp.ok) {
      uploaded = true;
      break;
    }
    const text = await uploadResp.text();
    lastErr = text;
    if (uploadResp.status === 409 || /already exists|duplicate/i.test(text)) {
      continue;
    }
    throw new Error(`SUPABASE_UPLOAD_FAILED:${text}`);
  }
  if (!uploaded || !objectPath) {
    throw new Error(`SUPABASE_UPLOAD_FAILED:${lastErr || "UNABLE_TO_RESOLVE_FILENAME"}`);
  }
  const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
  return {
    path: objectPath,
    url: publicUrl,
    storage: "supabase",
    bucket: supabaseBucket,
    objectPath,
    contentType
  };
}
async function supabaseAdminFetchJson(routePath, init) {
  const { url } = assertSupabaseAdminConfigured();
  const joinedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const r = await fetch(`${url}${joinedPath}`, {
    ...init || {},
    headers: {
      ...supabaseAdminHeaders(),
      ...init?.headers || {}
    }
  });
  if (!r.ok) {
    throw new Error(`SUPABASE_REQUEST_FAILED:${r.status}:${await r.text()}`);
  }
  return r.json();
}
async function supabaseSelectAllRaw(table, pageSize = 1e3) {
  const out = [];
  let offset = 0;
  for (; ; ) {
    const query = `select=*&limit=${pageSize}&offset=${offset}`;
    const rows = await supabaseAdminFetchJson(`/rest/v1/${encodeURIComponent(table)}?${query}`);
    const arr = Array.isArray(rows) ? rows : [];
    out.push(...arr);
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}
function defaultConflictColumnForTable(table) {
  if (table === "ev_coupons") return "code";
  if (table === "ev_site_pages") return "slug";
  if (table === FOOD_VENDOR_MENU_TABLE2 || table === LEGACY_FOOD_VENDOR_MENU_TABLE2 || table === "ev_vendor_menus") return "restaurant_id";
  return "id";
}
var INVOICE_TRANSACTION_TABLES = /* @__PURE__ */ new Set([
  "ev_bookings",
  "ev_cab_bookings",
  "ev_bus_bookings",
  "ev_rental_bookings",
  "ev_food_orders",
  "ev_mart_orders"
]);
function normalizeInvoiceTransactionTable(raw) {
  const t = safeText5(raw).toLowerCase();
  if (t === "bookings" || t === "travelbookings") return "ev_bookings";
  if (t === "cabbookings" || t === "cab-bookings") return "ev_cab_bookings";
  if (t === "busbookings" || t === "bus-bookings") return "ev_bus_bookings";
  if (t === "bikebookings" || t === "bike-bookings" || t === "rentalbookings" || t === "rental-bookings") return "ev_rental_bookings";
  if (t === "foodorders" || t === "food-orders") return "ev_food_orders";
  if (t === "martorders" || t === "mart-orders") return "ev_mart_orders";
  return t;
}
function parseInvoiceAmount(invoice) {
  const n = Number(invoice?.amount || 0);
  return Number.isFinite(n) ? n : 0;
}
function parseAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatINR(value) {
  const n = Number(value || 0);
  const v = Number.isFinite(n) ? n : 0;
  return `INR ${v.toFixed(2)}`;
}
function invoiceDateLabel(invoice) {
  const raw = safeText5(invoice?.issued_at || invoice?.created_at || "");
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IN", { hour12: true, timeZone: "Asia/Kolkata" });
}
async function fetchInvoiceByTransaction(table, transactionId) {
  const paymentId = `${table}:${transactionId}`;
  const endpoint = `/rest/v1/ev_invoices?select=*&payment_id=eq.${encodeURIComponent(paymentId)}&order=created_at.desc.nullslast&limit=1`;
  const rows = await supabaseAdminFetchJson(endpoint);
  const list = Array.isArray(rows) ? rows : [];
  return list[0] || null;
}
async function fetchTransactionRow(table, transactionId) {
  const endpoint = `/rest/v1/${encodeURIComponent(table)}?select=*&id=eq.${encodeURIComponent(transactionId)}&limit=1`;
  const rows = await supabaseAdminFetchJson(endpoint);
  const list = Array.isArray(rows) ? rows : [];
  return list[0] || null;
}
function isMissingInvoicesTableError(err) {
  const msg = safeText5(err?.message || err).toLowerCase();
  return msg.includes("pgrst205") && msg.includes("ev_invoices");
}
function transactionServiceName(table, row) {
  if (table === "ev_bookings") return safeText5(row?.type).toLowerCase() === "tour" ? "Tour Booking" : "Stay Booking";
  if (table === "ev_cab_bookings") return "Cab Booking";
  if (table === "ev_bus_bookings") return "Bus Booking";
  if (table === "ev_rental_bookings") return "Bike Booking";
  if (table === "ev_food_orders") return "Food Order";
  if (table === "ev_mart_orders") return "Mart Order";
  return "Transaction";
}
function transactionAmount(row) {
  const amountCandidates = [
    row?.amount,
    row?.paid_amount,
    row?.paidAmount,
    row?.total_price,
    row?.totalPrice,
    row?.total_amount,
    row?.totalAmount,
    row?.total_fare,
    row?.totalFare,
    row?.estimated_fare,
    row?.estimatedFare,
    row?.pricing?.totalAmount,
    row?.pricing?.total_amount,
    row?.pricing?.estimatedAmount
  ];
  for (const c of amountCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
function fallbackInvoiceFromTransaction(table, transaction) {
  const now = /* @__PURE__ */ new Date();
  const ts = now.getTime().toString().slice(-6);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const invoiceNo = `EV-INV-${y}${m}${d}-${ts}`;
  const txnId = safeText5(transaction?.id || "");
  return {
    id: `inv_fallback_${table}_${txnId}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase(),
    invoice_no: invoiceNo,
    service_name: transactionServiceName(table, transaction),
    user_name: safeText5(transaction?.user_name || transaction?.userName || transaction?.name || "Customer"),
    email: safeText5(transaction?.email || ""),
    phone: safeText5(transaction?.phone || ""),
    amount: transactionAmount(transaction),
    payment_method: safeText5(transaction?.payment_method || transaction?.paymentMethod || "system"),
    payment_status: "paid",
    issued_at: safeText5(
      transaction?.completed_at || transaction?.completedAt || transaction?.updated_at || transaction?.updatedAt || transaction?.created_at || transaction?.createdAt || now.toISOString()
    )
  };
}
function defaultInvoiceProfile() {
  return {
    brandName: "ExploreValley",
    logoUrl: "",
    sellerName: "ExploreValley Pvt Ltd",
    sellerAddress: "",
    gstin: "",
    fssai: "",
    cin: "",
    pan: "",
    placeOfSupply: "",
    supportEmail: "",
    supportPhone: "",
    authorizedSignatory: "Authorised Signatory",
    defaultHsnOrSac: "9964",
    defaultGstPercent: 5,
    terms: [],
    serviceProfiles: {}
  };
}
async function fetchImageBufferFromUrl(url) {
  const u = safeText5(url);
  if (!u || !/^https?:\/\//i.test(u)) return null;
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const b = Buffer.from(ab);
    return b.length ? b : null;
  } catch {
    return null;
  }
}
function safeObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
function serviceKeyForTable(table, transaction) {
  if (table === "ev_food_orders") return "food";
  if (table === "ev_mart_orders") return "mart";
  if (table === "ev_cab_bookings") return "cab";
  if (table === "ev_bus_bookings") return "bus";
  if (table === "ev_rental_bookings") return "bike";
  if (table === "ev_bookings") {
    const t = safeText5(transaction?.type).toLowerCase();
    if (t === "tour") return "tour";
    if (t === "stay") return "hotel";
    if (t === "hotel") return "hotel";
    if (t === "cottage") return "cottage";
    return "stay";
  }
  return "default";
}
async function fetchInvoiceProfileConfig() {
  const rows = await supabaseAdminFetchJson("/rest/v1/ev_settings?id=eq.main&select=tax_rules&limit=1");
  const row = Array.isArray(rows) ? rows[0] : null;
  const taxRules = safeObject(row?.tax_rules);
  const invoiceRaw = safeObject(taxRules.invoice || taxRules.invoice_profile || {});
  const defaults = defaultInvoiceProfile();
  const serviceProfiles = safeObject(invoiceRaw.serviceProfiles || invoiceRaw.service_profiles || {});
  return {
    ...defaults,
    ...invoiceRaw,
    serviceProfiles
  };
}
function mergeSellerProfile(baseProfile, serviceKey, vendorDetails) {
  const base = { ...defaultInvoiceProfile(), ...safeObject(baseProfile) };
  const byService = safeObject(base.serviceProfiles?.[serviceKey] || {});
  const vendor = safeObject(vendorDetails);
  const seller = {
    ...base,
    ...byService
  };
  if (safeText5(vendor?.name)) seller.sellerName = safeText5(vendor.name);
  if (safeText5(vendor?.address)) seller.sellerAddress = safeText5(vendor.address);
  if (safeText5(vendor?.gstin)) seller.gstin = safeText5(vendor.gstin);
  if (safeText5(vendor?.fssai)) seller.fssai = safeText5(vendor.fssai);
  if (safeText5(vendor?.cin)) seller.cin = safeText5(vendor.cin);
  if (safeText5(vendor?.pan)) seller.pan = safeText5(vendor.pan);
  if (safeText5(vendor?.supportEmail)) seller.supportEmail = safeText5(vendor.supportEmail);
  if (safeText5(vendor?.supportPhone)) seller.supportPhone = safeText5(vendor.supportPhone);
  if (safeText5(vendor?.placeOfSupply)) seller.placeOfSupply = safeText5(vendor.placeOfSupply);
  if (safeText5(vendor?.brandName)) seller.brandName = safeText5(vendor.brandName);
  if (safeText5(vendor?.logoUrl)) seller.logoUrl = safeText5(vendor.logoUrl);
  if (safeText5(vendor?.defaultHsnOrSac)) seller.defaultHsnOrSac = safeText5(vendor.defaultHsnOrSac);
  if (safeText5(vendor?.defaultGstPercent)) seller.defaultGstPercent = Number(vendor.defaultGstPercent);
  return seller;
}
function firstNonEmpty(...values) {
  for (const v of values) {
    const s = safeText5(v);
    if (s) return s;
  }
  return "";
}
function compactObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (safeText5(v)) out[k] = safeText5(v);
  }
  return out;
}
function invoiceProfileToVendorDetails(raw) {
  const p = safeObject(raw);
  return compactObject({
    name: firstNonEmpty(p?.sellerName, p?.name),
    address: firstNonEmpty(p?.sellerAddress, p?.address),
    gstin: firstNonEmpty(p?.gstin),
    fssai: firstNonEmpty(p?.fssai),
    cin: firstNonEmpty(p?.cin),
    pan: firstNonEmpty(p?.pan),
    supportEmail: firstNonEmpty(p?.supportEmail),
    supportPhone: firstNonEmpty(p?.supportPhone),
    placeOfSupply: firstNonEmpty(p?.placeOfSupply),
    brandName: firstNonEmpty(p?.brandName),
    logoUrl: firstNonEmpty(p?.logoUrl),
    defaultHsnOrSac: firstNonEmpty(p?.defaultHsnOrSac),
    defaultGstPercent: firstNonEmpty(p?.defaultGstPercent)
  });
}
function vendorProfileFromRow(row, options) {
  const r = safeObject(row);
  const allowGenericName = options?.allowGenericName !== false;
  return compactObject({
    brandName: firstNonEmpty(r?.brandName, r?.brand_name),
    logoUrl: firstNonEmpty(r?.logoUrl, r?.logo_url),
    name: firstNonEmpty(
      r?.sellerName,
      r?.seller_name,
      r?.legal_name,
      r?.legalName,
      r?.vendor_name,
      r?.vendorName,
      r?.provider_name,
      r?.providerName,
      r?.store_name,
      r?.storeName,
      r?.hotel_name,
      r?.hotelName,
      r?.tour_name,
      r?.tourName,
      allowGenericName ? r?.name : ""
    ),
    address: firstNonEmpty(
      r?.sellerAddress,
      r?.seller_address,
      r?.address,
      r?.location,
      r?.full_address,
      r?.fullAddress,
      r?.office_address,
      r?.officeAddress
    ),
    gstin: firstNonEmpty(r?.gstin, r?.gst_no, r?.gst_number, r?.gstNumber),
    fssai: firstNonEmpty(r?.fssai, r?.fssai_license, r?.fssaiLicense),
    cin: firstNonEmpty(r?.cin),
    pan: firstNonEmpty(r?.pan),
    supportEmail: firstNonEmpty(r?.support_email, r?.supportEmail, r?.email, r?.contact_email, r?.contactEmail),
    supportPhone: firstNonEmpty(r?.support_phone, r?.supportPhone, r?.phone, r?.contact_phone, r?.contactPhone, r?.mobile),
    placeOfSupply: firstNonEmpty(r?.place_of_supply, r?.placeOfSupply, r?.state, r?.city)
  });
}
async function fetchTableRowIfExists(table, id) {
  const rowId = safeText5(id);
  if (!rowId) return null;
  try {
    const rows = await supabaseAdminFetchJson(`/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(rowId)}&select=*&limit=1`);
    const list = Array.isArray(rows) ? rows : [];
    return list[0] || null;
  } catch {
    return null;
  }
}
async function fetchVendorDetailsForTransaction(table, transaction, invoiceProfile) {
  const fromTxn = vendorProfileFromRow(transaction, { allowGenericName: false });
  try {
    if (table === "ev_food_orders") {
      const restaurantId = safeText5(transaction?.restaurant_id || transaction?.restaurantId);
      const row = restaurantId ? await fetchTableRowIfExists(FOOD_VENDOR_TABLE2, restaurantId) || await fetchTableRowIfExists(LEGACY_FOOD_VENDOR_TABLE2, restaurantId) : null;
      const profileMap = safeObject(invoiceProfile?.foodVendorProfiles || invoiceProfile?.food_vendor_profiles || {});
      const profile = invoiceProfileToVendorDetails(profileMap?.[restaurantId]);
      return { ...vendorProfileFromRow(row), ...profile, ...fromTxn };
    }
    if (table === "ev_mart_orders") {
      const martId = safeText5(transaction?.mart_partner_id || transaction?.martPartnerId || transaction?.mart_id || transaction?.martId);
      const row = martId ? await fetchTableRowIfExists("ev_mart_partners", martId) : null;
      return { ...vendorProfileFromRow(row), ...fromTxn };
    }
    if (table === "ev_bookings") {
      const type = safeText5(transaction?.type).toLowerCase();
      const itemId = safeText5(transaction?.item_id || transaction?.itemId || transaction?.hotel_id || transaction?.hotelId || transaction?.tour_id || transaction?.tourId || "");
      if (type === "tour") {
        const row2 = itemId ? await fetchTableRowIfExists("ev_tours", itemId) : null;
        return { ...vendorProfileFromRow(row2), ...fromTxn };
      }
      const row = itemId ? await fetchTableRowIfExists("ev_hotels", itemId) : null;
      return { ...vendorProfileFromRow(row), ...fromTxn };
    }
    if (table === "ev_cab_bookings") {
      const rateId = safeText5(transaction?.rate_id || transaction?.rateId || transaction?.cab_rate_id || transaction?.cabRateId || transaction?.service_area_id || transaction?.serviceAreaId);
      const providerId = safeText5(transaction?.provider_id || transaction?.providerId || transaction?.cab_provider_id || transaction?.cabProviderId);
      const rateRow = rateId ? await fetchTableRowIfExists("ev_cab_rates", rateId) : null;
      const providerRow = providerId ? await fetchTableRowIfExists("ev_cab_providers", providerId) : null;
      const inferredProviderId = safeText5(rateRow?.provider_id || rateRow?.providerId || rateRow?.cab_provider_id || rateRow?.cabProviderId);
      const inferredProviderRow = !providerRow && inferredProviderId ? await fetchTableRowIfExists("ev_cab_providers", inferredProviderId) : null;
      return { ...vendorProfileFromRow(rateRow), ...vendorProfileFromRow(providerRow), ...vendorProfileFromRow(inferredProviderRow), ...fromTxn };
    }
    if (table === "ev_rental_bookings") {
      const vehicleId = safeText5(transaction?.bike_rental_id || transaction?.bikeRentalId || transaction?.vehicle_id || transaction?.vehicleId);
      const vendorId = safeText5(transaction?.vendor_id || transaction?.vendorId || transaction?.provider_id || transaction?.providerId);
      const vehicleRow = vehicleId ? await fetchTableRowIfExists("ev_rental_vehicles", vehicleId) : null;
      const vendorRow = vendorId ? await fetchTableRowIfExists("ev_bike_rentals", vendorId) : null;
      const inferredVendorId = safeText5(vehicleRow?.vendor_id || vehicleRow?.vendorId || vehicleRow?.provider_id || vehicleRow?.providerId);
      const inferredVendorRow = !vendorRow && inferredVendorId ? await fetchTableRowIfExists("ev_bike_rentals", inferredVendorId) : null;
      return { ...vendorProfileFromRow(vehicleRow), ...vendorProfileFromRow(vendorRow), ...vendorProfileFromRow(inferredVendorRow), ...fromTxn };
    }
    return fromTxn;
  } catch {
    return fromTxn;
  }
}
function splitTax(total, gstPercent) {
  const gstRate = Math.max(0, Number(gstPercent || 0)) / 100;
  const gross = Math.max(0, Number(total || 0));
  if (!gstRate) {
    return { taxable: gross, gstAmount: 0, cgstPct: 0, sgstPct: 0, cgstInr: 0, sgstInr: 0 };
  }
  const taxable = gross / (1 + gstRate);
  const gstAmount = gross - taxable;
  const cgstInr = gstAmount / 2;
  const sgstInr = gstAmount - cgstInr;
  const halfPct = gstPercent / 2;
  return {
    taxable,
    gstAmount,
    cgstPct: halfPct,
    sgstPct: halfPct,
    cgstInr,
    sgstInr
  };
}
function normalizeInvoiceItems(table, transaction, serviceName, hsn, gstPercent) {
  const listRaw = Array.isArray(transaction?.items) ? transaction.items : [];
  if (listRaw.length) {
    return listRaw.map((it, idx) => {
      const qty2 = Math.max(1, Math.floor(parseAmount(it?.quantity || it?.qty || 1)));
      const mrp2 = parseAmount(it?.mrp || it?.listPrice || it?.price || it?.unitPrice || it?.unit_price);
      const discount = parseAmount(it?.discount || 0);
      const lineGross = Math.max(0, mrp2 * qty2 - discount);
      const t2 = splitTax(lineGross, gstPercent);
      return {
        sr: idx + 1,
        upc: safeText5(it?.upc || it?.hsn || hsn),
        description: safeText5(it?.name || it?.title || serviceName),
        mrp: mrp2,
        discount,
        qty: qty2,
        taxableValue: t2.taxable,
        cgstPct: t2.cgstPct,
        cgstInr: t2.cgstInr,
        sgstPct: t2.sgstPct,
        sgstInr: t2.sgstInr,
        cessPct: 0,
        additionalCess: 0,
        total: lineGross
      };
    });
  }
  const total = transactionAmount(transaction);
  const qty = Math.max(1, Math.floor(parseAmount(transaction?.qty || transaction?.quantity || transaction?.passengers || 1)));
  const mrp = qty > 0 ? total / qty : total;
  const t = splitTax(total, gstPercent);
  return [{
    sr: 1,
    upc: hsn,
    description: serviceName,
    mrp,
    discount: 0,
    qty,
    taxableValue: t.taxable,
    cgstPct: t.cgstPct,
    cgstInr: t.cgstInr,
    sgstPct: t.sgstPct,
    sgstInr: t.sgstInr,
    cessPct: 0,
    additionalCess: 0,
    total
  }];
}
function numberToWordsUnder1000(n) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${numberToWordsUnder1000(n % 100)}` : ""}`;
}
function numberToIndianWords(value) {
  let n = Math.max(0, Math.floor(Number(value || 0)));
  if (!n) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 1e7);
  if (crore) {
    parts.push(`${numberToWordsUnder1000(crore)} Crore`);
    n %= 1e7;
  }
  const lakh = Math.floor(n / 1e5);
  if (lakh) {
    parts.push(`${numberToWordsUnder1000(lakh)} Lakh`);
    n %= 1e5;
  }
  const thousand = Math.floor(n / 1e3);
  if (thousand) {
    parts.push(`${numberToWordsUnder1000(thousand)} Thousand`);
    n %= 1e3;
  }
  if (n) parts.push(numberToWordsUnder1000(n));
  return parts.join(" ").trim();
}
function amountInWordsINR(total) {
  const v = Math.max(0, Number(total || 0));
  const rupees = Math.floor(v);
  const paise = Math.round((v - rupees) * 100);
  const rupeeWords = `${numberToIndianWords(rupees)} Rupees`;
  if (!paise) return `${rupeeWords} And Zero Paisa Only`;
  return `${rupeeWords} And ${numberToIndianWords(paise)} Paisa Only`;
}
async function buildInvoicePdfBuffer(invoice, transaction, options) {
  const doc = new import_pdfkit.default({ size: "A4", margin: 42 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  const finished = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const invoiceNo = safeText5(invoice?.invoice_no || invoice?.id || "");
  const txnId = safeText5(transaction?.id || "");
  const customer = safeText5(invoice?.user_name || transaction?.user_name || transaction?.userName || "Customer");
  const email = safeText5(invoice?.email || transaction?.email || "");
  const phone = safeText5(invoice?.phone || transaction?.phone || "");
  const serviceName = safeText5(options?.serviceName || invoice?.service_name || "Transaction");
  const paymentMethod = safeText5(invoice?.payment_method || "system");
  const paymentStatus = safeText5(invoice?.payment_status || "paid");
  const issuedAt = invoiceDateLabel(invoice);
  const amount = parseInvoiceAmount(invoice);
  const seller = { ...defaultInvoiceProfile(), ...safeObject(options?.sellerProfile) };
  const items = Array.isArray(options?.items) ? options?.items : [];
  const placeOfSupply = safeText5(options?.placeOfSupply || seller.placeOfSupply || "");
  const amountWords = amountInWordsINR(amount);
  const hardWrap = (value, chunk = 14) => {
    const raw = safeText5(value);
    if (!raw) return "";
    return raw.replace(new RegExp(`([^\\s]{${chunk}})`, "g"), "$1 ");
  };
  const truncate = (value, max = 24) => {
    const s = safeText5(value);
    if (s.length <= max) return s;
    return `${s.slice(0, Math.max(1, max - 1))}\u2026`;
  };
  doc.rect(28, 28, 540, 760).lineWidth(1).stroke("#1e1e1e");
  const logoUrl = safeText5(seller?.logoUrl || "");
  let drewLogo = false;
  if (logoUrl) {
    const logoBuf = await fetchImageBufferFromUrl(logoUrl);
    if (logoBuf) {
      try {
        doc.image(logoBuf, 36, 42, { fit: [170, 56], align: "left", valign: "center" });
        drewLogo = true;
      } catch {
        drewLogo = false;
      }
    }
  }
  if (!drewLogo) {
    doc.fontSize(26).fillColor("#111").text(safeText5(seller.brandName || "ExploreValley"), 36, 50, { width: 260 });
  }
  doc.fillColor("#111");
  doc.fontSize(32).text("Tax Invoice", 330, 56, { width: 220, align: "left" });
  const headY = 112;
  doc.moveTo(28, headY).lineTo(568, headY).stroke("#1e1e1e");
  const leftX = 34;
  const leftW = 340;
  let leftY = headY + 10;
  doc.font("Helvetica").fontSize(11).text("Sold By / Seller", leftX, leftY, { width: leftW });
  leftY += 16;
  doc.font("Helvetica-Bold").fontSize(13).text(safeText5(seller.sellerName || "Seller"), leftX, leftY, { width: leftW });
  leftY += 18;
  doc.font("Helvetica").fontSize(10).text(safeText5(seller.sellerAddress || "-"), leftX, leftY, { width: leftW });
  leftY += Math.max(24, doc.heightOfString(safeText5(seller.sellerAddress || "-"), { width: leftW, align: "left" })) + 6;
  doc.text(`GSTIN: ${safeText5(seller.gstin || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`FSSAI License Number: ${safeText5(seller.fssai || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`CIN: ${safeText5(seller.cin || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`PAN: ${safeText5(seller.pan || "-")}`, leftX, leftY, { width: leftW });
  leftY += 6;
  const rightX = 384;
  const labelW = 76;
  const valueW = 100;
  let rightY = headY + 18;
  const drawRightRow = (label, value) => {
    doc.font("Helvetica").fontSize(9).text(label, rightX, rightY, { width: labelW, lineBreak: false });
    const wrapped = hardWrap(value, 12);
    doc.font("Helvetica-Bold").fontSize(9).text(wrapped, rightX + labelW, rightY, { width: valueW });
    const h = doc.heightOfString(wrapped, { width: valueW });
    rightY += Math.max(13, h + 2);
  };
  drawRightRow("Invoice Number:", invoiceNo);
  drawRightRow("Transaction ID:", txnId);
  drawRightRow("Payment:", paymentMethod);
  drawRightRow("Status:", paymentStatus);
  drawRightRow("Date:", issuedAt || "-");
  let splitY = Math.max(leftY, rightY) + 8;
  doc.moveTo(28, splitY).lineTo(568, splitY).stroke("#1e1e1e");
  splitY += 8;
  doc.font("Helvetica-Bold").fontSize(13).text("Invoice To", 34, splitY);
  doc.font("Helvetica").fontSize(11);
  splitY += 20;
  doc.text(`Name: ${customer || "-"}`, 34, splitY, { width: 520 });
  splitY += 15;
  const addr = safeText5(transaction?.delivery_address || transaction?.deliveryAddress || transaction?.pickup_location || transaction?.pickupLocation || "-");
  doc.text(`Address: ${addr}`, 34, splitY, { width: 520 });
  splitY += Math.max(18, doc.heightOfString(`Address: ${addr}`, { width: 520 })) + 2;
  doc.text(`Phone: ${phone || "-"}`, 34, splitY, { width: 520 });
  splitY += 15;
  doc.text(`Email: ${hardWrap(email || "-", 24)}`, 34, splitY, { width: 520 });
  splitY += Math.max(15, doc.heightOfString(`Email: ${hardWrap(email || "-", 24)}`, { width: 520 })) + 2;
  doc.text(`Place of Supply: ${placeOfSupply || "-"}`, 34, splitY, { width: 520 });
  let tableTop = splitY + 14;
  doc.moveTo(28, tableTop).lineTo(568, tableTop).stroke("#1e1e1e");
  tableTop += 4;
  const cols = [
    { key: "sr", label: "Sr", w: 20 },
    { key: "upc", label: "UPC/HSN", w: 42 },
    { key: "description", label: "Item Description", w: 110 },
    { key: "mrp", label: "MRP", w: 42 },
    { key: "discount", label: "Discount", w: 42 },
    { key: "qty", label: "Qty", w: 26 },
    { key: "taxableValue", label: "Taxable", w: 50 },
    { key: "cgstPct", label: "CGST%", w: 34 },
    { key: "cgstInr", label: "CGST", w: 38 },
    { key: "sgstPct", label: "SGST%", w: 34 },
    { key: "sgstInr", label: "SGST", w: 38 },
    { key: "total", label: "Total", w: 50 }
  ];
  let x = 32;
  doc.font("Helvetica-Bold").fontSize(8);
  cols.forEach((c) => {
    doc.text(c.label, x, tableTop, { width: c.w, align: "left" });
    x += c.w;
  });
  doc.font("Helvetica").fontSize(8);
  let rowY = tableTop + 13;
  const list = items.length ? items : [{ sr: 1, description: serviceName, upc: safeText5(seller.defaultHsnOrSac || ""), mrp: amount, discount: 0, qty: 1, taxableValue: amount, cgstPct: 0, cgstInr: 0, sgstPct: 0, sgstInr: 0, total: amount }];
  list.forEach((it) => {
    let cx = 32;
    const values = {
      sr: it.sr,
      upc: safeText5(it.upc),
      description: safeText5(it.description),
      mrp: parseAmount(it.mrp).toFixed(2),
      discount: parseAmount(it.discount).toFixed(2),
      qty: parseAmount(it.qty).toFixed(0),
      taxableValue: parseAmount(it.taxableValue).toFixed(2),
      cgstPct: parseAmount(it.cgstPct).toFixed(2),
      cgstInr: parseAmount(it.cgstInr).toFixed(2),
      sgstPct: parseAmount(it.sgstPct).toFixed(2),
      sgstInr: parseAmount(it.sgstInr).toFixed(2),
      total: parseAmount(it.total).toFixed(2)
    };
    cols.forEach((c) => {
      const raw = safeText5(values[c.key]);
      const cell = c.key === "description" ? truncate(raw, 30) : truncate(raw, 12);
      doc.text(cell, cx + 1, rowY, { width: c.w - 2, align: "left", lineBreak: false });
      cx += c.w;
    });
    rowY += 13;
  });
  doc.moveTo(28, rowY + 2).lineTo(568, rowY + 2).stroke("#1e1e1e");
  doc.font("Helvetica-Bold").fontSize(10).text(`Total: ${formatINR(amount)}`, 34, rowY + 8, { width: 260, align: "left" });
  doc.font("Helvetica").fontSize(10).text(`Amount in Words: ${amountWords}`, 34, rowY + 22, { width: 520, align: "left" });
  let footerY = rowY + 52;
  doc.moveTo(28, footerY).lineTo(568, footerY).stroke("#1e1e1e");
  footerY += 10;
  doc.font("Helvetica-Bold").fontSize(11).text("Seller Contact", 34, footerY);
  doc.font("Helvetica").fontSize(10);
  footerY += 15;
  doc.text(`Support Email: ${safeText5(seller.supportEmail || "-")}`, 34, footerY);
  footerY += 14;
  doc.text(`Support Phone: ${safeText5(seller.supportPhone || "-")}`, 34, footerY);
  footerY += 20;
  const defaultTerms = [
    "This is a system-generated invoice.",
    "For invoice corrections, contact support within 48 hours."
  ];
  const terms = (Array.isArray(seller.terms) ? seller.terms : []).map((x2) => safeText5(x2)).filter(Boolean);
  const showTerms = !(terms.length === 2 && terms[0] === defaultTerms[0] && terms[1] === defaultTerms[1]);
  let termsY = footerY;
  if (showTerms && terms.length) {
    doc.font("Helvetica-Bold").fontSize(11).text("Terms & Conditions", 34, footerY);
    doc.font("Helvetica").fontSize(9);
    termsY = footerY + 14;
    terms.slice(0, 5).forEach((line, idx) => {
      doc.text(`${idx + 1}. ${safeText5(line)}`, 34, termsY, { width: 420 });
      termsY += 12;
    });
  }
  const signatoryRaw = safeText5(seller.authorizedSignatory || "Authorised Signatory");
  const isGenericSignatory = signatoryRaw.toLowerCase() === "authorised signatory" || signatoryRaw.toLowerCase() === "authorized signatory";
  const signatoryText = isGenericSignatory ? "Authorised Signatory" : `Authorised Signatory: ${signatoryRaw}`;
  doc.font("Helvetica-Bold").fontSize(10).text(signatoryText, 34, showTerms && terms.length ? termsY + 14 : footerY + 14, { width: 520, align: "left" });
  doc.font("Helvetica");
  doc.end();
  return finished;
}
function isCancelledTransaction(row) {
  const status = safeText5(row?.status || row?.order_status || row?.orderStatus).toLowerCase();
  if (["cancelled", "canceled", "rejected", "failed", "expired", "refunded"].includes(status)) return true;
  const refundStatus = safeText5(row?.refund_status || row?.refundStatus).toLowerCase();
  return ["completed", "processed", "refunded"].includes(refundStatus);
}
var REFUND_ORDER_TABLES = [
  "ev_bookings",
  "ev_cab_bookings",
  "ev_rental_bookings",
  "ev_mart_orders",
  "ev_bus_bookings",
  "ev_food_orders"
];
function normalizeRefundStatus(raw) {
  const s = safeText5(raw).toLowerCase();
  if (s === "approved") return "processing";
  if (s === "processed") return "completed";
  if (s === "process") return "processing";
  if (s === "complete") return "completed";
  if (s === "pending" || s === "processing" || s === "completed" || s === "rejected") return s;
  return "pending";
}
function refundAuditAction(status) {
  if (status === "pending") return "REFUND_REQUESTED";
  if (status === "processing") return "REFUND_APPROVED";
  if (status === "rejected") return "REFUND_REJECTED";
  if (status === "completed") return "REFUND_PROCESSED";
  return "";
}
function inferRefundOrderTable(orderId, orderType) {
  const t = safeText5(orderType).toLowerCase();
  if (t === "cab") return "ev_cab_bookings";
  if (t === "food") return "ev_food_orders";
  if (t === "bike") return "ev_rental_bookings";
  if (t === "mart") return "ev_mart_orders";
  if (t === "bus") return "ev_bus_bookings";
  const id = safeText5(orderId).toLowerCase();
  if (id.startsWith("cab_")) return "ev_cab_bookings";
  if (id.startsWith("food_")) return "ev_food_orders";
  if (id.startsWith("bike_")) return "ev_rental_bookings";
  if (id.startsWith("mart_")) return "ev_mart_orders";
  if (id.startsWith("bus_")) return "ev_bus_bookings";
  return "ev_bookings";
}
async function patchOrderRefundStatus(table, orderId, status) {
  const { url } = assertSupabaseAdminConfigured();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const payload = {
    refund_flag: status !== "rejected",
    refund_status: status,
    refund_updated_at: now
  };
  if (status === "completed") payload.status = "cancelled";
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(orderId)}&select=id,status,refund_status,refund_updated_at`;
  const r = await fetch(endpoint, {
    method: "PATCH",
    headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    throw new Error(`REFUND_STATUS_PATCH_FAILED:${table}:${orderId}:${r.status}:${await r.text()}`);
  }
  const rows = await r.json().catch(() => []);
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`ORDER_NOT_FOUND:${table}:${orderId}`);
  }
  return rows[0];
}
function getOpenApiSchemas(openApi) {
  if (openApi?.definitions && typeof openApi.definitions === "object") {
    return openApi.definitions;
  }
  return openApi?.components?.schemas && typeof openApi.components.schemas === "object" ? openApi.components.schemas : {};
}
async function localFallbackRowsForTable(name) {
  const table = safeText5(name);
  if (table !== "ev_queries") return [];
  try {
    const db = await readData();
    const rows = Array.isArray(db?.queries) ? db.queries : [];
    return rows.map((x) => ({
      id: safeText5(x?.id),
      user_name: safeText5(x?.userName),
      email: safeText5(x?.email),
      phone: safeText5(x?.phone),
      subject: safeText5(x?.subject),
      message: safeText5(x?.message),
      // Carried through so the dashboard's per-order support column still works
      // when this fallback is serving instead of Supabase.
      order_id: safeText5(x?.orderId),
      order_type: safeText5(x?.orderType),
      source: safeText5(x?.source) || "contact_page",
      status: safeText5(x?.status || "pending"),
      submitted_at: safeText5(x?.submittedAt) || null,
      responded_at: safeText5(x?.respondedAt) || null,
      response: safeText5(x?.response) || null
    }));
  } catch {
    return [];
  }
}
adminRouter.get("/supabase/snapshot", async (req, res) => {
  try {
    const openApi = await supabaseAdminFetchJson("/rest/v1/", {
      headers: { Accept: "application/openapi+json" }
    });
    const schemas = getOpenApiSchemas(openApi);
    const requestedTables = String(req.query.tables || "").split(",").map((x) => safeText5(x)).filter(Boolean);
    const schemaTableNames = Object.keys(schemas).filter((name) => name.startsWith("ev_")).sort((a, b) => a.localeCompare(b));
    const requestedSafeTables = requestedTables.filter((name) => /^ev_[a-z0-9_]+$/i.test(name)).sort((a, b) => a.localeCompare(b));
    const tableNames = Array.from(new Set(
      requestedSafeTables.length ? [...schemaTableNames.filter((name) => requestedSafeTables.includes(name)), ...requestedSafeTables] : schemaTableNames
    ));
    const tables = await Promise.all(tableNames.map(async (name) => {
      const schema = schemas[name] || {};
      const required = Array.isArray(schema.required) ? schema.required.map((x) => String(x)) : [];
      const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
      let rows = [];
      try {
        rows = await supabaseSelectAllRaw(name);
      } catch (err) {
        const msg = String(err?.message || err || "");
        if (requestedSafeTables.includes(name)) {
          const fallbackTable = fallbackTableForRequestedTable(name);
          if (fallbackTable && fallbackTable !== name) {
            try {
              rows = await supabaseSelectAllRaw(fallbackTable);
            } catch (fallbackErr) {
              const fallbackMsg = String(fallbackErr?.message || fallbackErr || "");
              if (!isMissingRelationErrorMessage(fallbackMsg, fallbackTable)) {
                throw fallbackErr;
              }
              rows = [];
            }
          } else {
            rows = [];
          }
        } else {
          throw err;
        }
      }
      if (!rows.length) {
        const fallbackRows = await localFallbackRowsForTable(name);
        if (fallbackRows.length) rows = fallbackRows;
      }
      if (name === "ev_mart_products") {
        rows = rows.map((row) => normalizeMartProductRow(row));
      }
      const schemaColumns = Object.entries(props).map(([colName, meta]) => ({
        name: String(colName),
        type: String(meta?.type || meta?.format || "unknown"),
        nullable: meta?.nullable === true,
        required: required.includes(String(colName))
      }));
      const inferredColumns = rows[0] ? Object.keys(rows[0]).map((colName) => ({
        name: String(colName),
        type: typeof rows[0][colName],
        nullable: rows[0][colName] === null,
        required: false
      })) : [];
      const columns = schemaColumns.length ? schemaColumns : inferredColumns;
      return {
        name,
        columns,
        rowCount: rows.length,
        rows
      };
    }));
    return res.json({
      source: "supabase",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tables
    });
  } catch (err) {
    return res.status(500).json({
      error: "SUPABASE_SNAPSHOT_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.post("/supabase/upsert", async (req, res) => {
  try {
    const table = safeText5(req.body?.table || "");
    const rawIncomingRows = Array.isArray(req.body?.rows) ? req.body.rows : req.body?.rows && typeof req.body.rows === "object" && !Array.isArray(req.body.rows) ? [req.body.rows] : req.body?.row && typeof req.body.row === "object" && !Array.isArray(req.body.row) ? [req.body.row] : [];
    const onConflict = safeText5(req.body?.onConflict || defaultConflictColumnForTable(table));
    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(onConflict)) {
      return res.status(400).json({ error: "INVALID_ON_CONFLICT_COLUMN" });
    }
    if (!rawIncomingRows.length) {
      return res.json({ ok: true, table, affected: 0 });
    }
    let incomingRows = rawIncomingRows;
    let menuRowStats = { generatedIds: 0, deduped: 0 };
    if (table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2) {
      const restaurantIds = Array.from(new Set(
        rawIncomingRows.map((row) => safeText5(row?.restaurant_id || row?.restaurantId || "")).filter(Boolean)
      ));
      const vendorNameByRestaurantId = /* @__PURE__ */ new Map();
      if (restaurantIds.length) {
        try {
          const vendorRows = await supabaseAdminFetchJson(
            `/rest/v1/${encodeURIComponent(FOOD_VENDOR_TABLE2)}?select=id,name&id=in.(${restaurantIds.map((id) => encodeURIComponent(String(id))).join(",")})`
          );
          (Array.isArray(vendorRows) ? vendorRows : []).forEach((row) => {
            const id = safeText5(row?.id || "");
            if (!id) return;
            vendorNameByRestaurantId.set(id, safeText5(row?.name || id) || id);
          });
        } catch {
          try {
            const vendorRows = await supabaseAdminFetchJson(
              `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_TABLE2)}?select=id,name&id=in.(${restaurantIds.map((id) => encodeURIComponent(String(id))).join(",")})`
            );
            (Array.isArray(vendorRows) ? vendorRows : []).forEach((row) => {
              const id = safeText5(row?.id || "");
              if (!id) return;
              vendorNameByRestaurantId.set(id, safeText5(row?.name || id) || id);
            });
          } catch {
          }
        }
      }
      const normalizedMenuRows = normalizeMenuItemUpsertRows(rawIncomingRows, { vendorNameByRestaurantId });
      incomingRows = normalizedMenuRows.rows;
      menuRowStats = {
        generatedIds: normalizedMenuRows.generatedIds,
        deduped: normalizedMenuRows.deduped
      };
    } else if (table === "ev_mart_products") {
      incomingRows = rawIncomingRows.map((row) => normalizeMartProductRow(row));
    }
    const dedupedRows = [];
    const indexByConflict = /* @__PURE__ */ new Map();
    const duplicateConflictKeys = /* @__PURE__ */ new Set();
    incomingRows.forEach((row) => {
      const hasConflictKey = row && Object.prototype.hasOwnProperty.call(row, onConflict);
      const key = hasConflictKey ? safeText5(row?.[onConflict]) : "";
      if (!hasConflictKey) {
        dedupedRows.push(row);
        return;
      }
      const existingIdx = indexByConflict.get(key);
      if (existingIdx === void 0) {
        indexByConflict.set(key, dedupedRows.length);
        dedupedRows.push(row);
        return;
      }
      duplicateConflictKeys.add(key);
      dedupedRows[existingIdx] = row;
    });
    let payload = [];
    if (table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2) {
      try {
        await supabaseAdminUpsertRowsIndividually(table, dedupedRows, onConflict);
      } catch (err) {
        const msg = String(err?.message || err || "");
        const fallbackTable = fallbackTableForRequestedTable(table);
        if (!fallbackTable || fallbackTable === table || !isMissingRelationErrorMessage(msg, table)) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table,
            message: msg
          });
        }
        try {
          await supabaseAdminUpsertRowsIndividually(fallbackTable, dedupedRows, onConflict);
        } catch (fallbackErr) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table: fallbackTable,
            message: String(fallbackErr?.message || fallbackErr)
          });
        }
      }
    } else {
      const { url } = assertSupabaseAdminConfigured();
      const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(dedupedRows)
      });
      if (!r.ok) {
        const msg = await r.text();
        const fallbackTable = fallbackTableForRequestedTable(table);
        if (!fallbackTable || fallbackTable === table || !isMissingRelationErrorMessage(msg, table)) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table,
            message: msg
          });
        }
        const fallbackEndpoint = `${url}/rest/v1/${encodeURIComponent(fallbackTable)}?on_conflict=${encodeURIComponent(onConflict)}`;
        const fallbackResp = await fetch(fallbackEndpoint, {
          method: "POST",
          headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
          body: JSON.stringify(dedupedRows)
        });
        if (!fallbackResp.ok) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table: fallbackTable,
            message: await fallbackResp.text()
          });
        }
        payload = await fallbackResp.json().catch(() => []);
      } else {
        payload = await r.json().catch(() => []);
      }
    }
    if (table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2) {
      const affectedRestaurantIds = Array.from(new Set(
        dedupedRows.map((row) => safeText5(row?.restaurant_id || row?.restaurantId || "")).filter(Boolean)
      ));
      try {
        await syncVendorMenuBlobsFromItems(affectedRestaurantIds);
      } catch (err) {
        console.error("[admin.supabase.upsert] vendor menu blob sync failed", {
          table,
          affectedRestaurantIds,
          message: String(err?.message || err)
        });
      }
    }
    if (table === "ev_refunds") {
      const statusToAction = (statusRaw) => {
        const s = safeText5(statusRaw).toLowerCase();
        if (s === "approved") return "REFUND_APPROVED";
        if (s === "rejected") return "REFUND_REJECTED";
        if (s === "processed") return "REFUND_PROCESSED";
        if (s === "pending") return "REFUND_REQUESTED";
        return "";
      };
      try {
        await mutateData((db) => {
          if (!Array.isArray(db.auditLog)) db.auditLog = [];
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const sourceRows3 = Array.isArray(payload) && payload.length ? payload : dedupedRows;
          sourceRows3.forEach((row) => {
            const action = statusToAction(row?.status);
            const orderId = safeText5(row?.order_id || row?.orderId);
            if (!action || !orderId) return;
            db.auditLog.push({
              id: makeId("audit"),
              at: now,
              action,
              entity: "refund",
              entityId: safeText5(row?.id || ""),
              meta: {
                refundId: safeText5(row?.id || ""),
                orderId,
                status: safeText5(row?.status || ""),
                reason: safeText5(row?.reason || ""),
                amount: Number(row?.amount || 0)
              }
            });
          });
        }, "admin_refund_status_upsert");
      } catch {
      }
      const sourceRows2 = Array.isArray(payload) && payload.length ? payload : dedupedRows;
      for (const row of sourceRows2) {
        const orderId = safeText5(row?.order_id || row?.orderId);
        if (!orderId) continue;
        const orderTable = inferRefundOrderTable(orderId, safeText5(row?.order_type || row?.orderType));
        if (!REFUND_ORDER_TABLES.includes(orderTable)) continue;
        try {
          await patchOrderRefundStatus(orderTable, orderId, normalizeRefundStatus(row?.status));
        } catch {
        }
      }
    }
    const sourceRows = Array.isArray(payload) && payload.length ? payload : dedupedRows;
    await Promise.allSettled(
      sourceRows.map(
        (row) => ensureInvoiceForCompletedTransaction({
          table,
          row,
          source: "admin_supabase_upsert"
        })
      )
    );
    return res.json({
      ok: true,
      table,
      affected: Array.isArray(payload) ? payload.length : dedupedRows.length,
      rows: payload,
      deduped: duplicateConflictKeys.size + (table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2 ? menuRowStats.deduped : 0),
      generatedIds: table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2 ? menuRowStats.generatedIds : 0,
      dedupedKeys: Array.from(duplicateConflictKeys)
    });
  } catch (err) {
    return res.status(500).json({
      error: "SUPABASE_UPSERT_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.post("/drivers/:id/update", async (req, res) => {
  const driverId = safeText5(req.params.id || "");
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!driverId) return res.status(400).json({ error: "DRIVER_ID_REQUIRED" });
  const nameInput = safeText5(body?.name);
  const usernameInput = normalizeDriverUsername(body?.username);
  const phoneInput = safeText5(body?.phone);
  const emailInput = safeText5(body?.email).toLowerCase();
  const statusInput = safeText5(body?.status).toLowerCase();
  const passwordInput = safeText5(body?.password);
  const vehicleTypeInput = safeText5(body?.vehicleType);
  const carNameInput = safeText5(body?.carName);
  const vehicleNumberInput = safeText5(body?.vehicleNumber);
  const licenseNumberInput = safeText5(body?.licenseNumber);
  const notesInput = safeText5(body?.notes);
  const hasActive = typeof body?.active === "boolean";
  if (!nameInput || !usernameInput || !phoneInput) {
    return res.status(400).json({ error: "NAME_USERNAME_PHONE_REQUIRED" });
  }
  if (!["pending", "approved", "rejected", "disabled"].includes(statusInput || "")) {
    return res.status(400).json({ error: "INVALID_STATUS" });
  }
  const nextPhone = normalizeDriverPhone(phoneInput);
  if (!nextPhone) return res.status(400).json({ error: "PHONE_REQUIRED" });
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let result = null;
    await mutateData((db) => {
      const anyDb = db;
      const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
      const vehicles = Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : anyDb.driverVehicles = [];
      const requests = Array.isArray(anyDb.driverRegistrationRequests) ? anyDb.driverRegistrationRequests : [];
      const driver = drivers.find((x) => safeText5(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");
      const dupUsername = drivers.find(
        (x) => safeText5(x?.id) !== driverId && normalizeDriverUsername(x?.username) === usernameInput
      );
      if (dupUsername) throw new Error("USERNAME_ALREADY_IN_USE");
      const dupPhone = drivers.find(
        (x) => safeText5(x?.id) !== driverId && normalizeDriverPhone(safeText5(x?.phone)) === nextPhone
      );
      if (dupPhone) throw new Error("PHONE_ALREADY_IN_USE");
      driver.name = nameInput;
      driver.username = usernameInput;
      driver.phone = nextPhone;
      driver.email = emailInput;
      driver.status = statusInput;
      if (hasActive) driver.active = body.active === true;
      if (passwordInput) driver.passwordHash = hashDriverPassword(passwordInput);
      driver.updatedAt = now;
      const vehicle = vehicles.find((x) => safeText5(x?.driverId) === driverId);
      if (vehicle) {
        vehicle.vehicleType = vehicleTypeInput || vehicle.vehicleType || "";
        vehicle.viechle_cat = vehicleTypeInput || vehicle.viechle_cat || vehicle.vehicleType || "";
        vehicle.model = carNameInput;
        vehicle.carName = carNameInput;
        vehicle.vehicleNumber = vehicleNumberInput;
        vehicle.updatedAt = now;
      } else {
        vehicles.unshift({
          id: makeId("veh"),
          driverId,
          vehicleType: vehicleTypeInput || "ordinary",
          viechle_cat: vehicleTypeInput || "ordinary",
          vehicleNumber: vehicleNumberInput,
          color: "",
          model: carNameInput,
          carName: carNameInput,
          seats: safeText5(vehicleTypeInput).toLowerCase().includes("suv") ? 6 : 4,
          createdAt: now,
          updatedAt: now
        });
      }
      const reqId = safeText5(driver?.registrationRequestId || "");
      const reqRow = requests.find((x) => safeText5(x?.id) === reqId);
      if (reqRow) {
        reqRow.name = nameInput;
        reqRow.phone = nextPhone;
        reqRow.email = emailInput;
        reqRow.vehicleType = vehicleTypeInput || reqRow.vehicleType || "";
        reqRow.vehicleNumber = vehicleNumberInput;
        reqRow.licenseNumber = licenseNumberInput || reqRow.licenseNumber || "";
        reqRow.notes = notesInput;
        reqRow.updatedAt = now;
      }
      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_UPDATED_BY_ADMIN",
        entity: "driver",
        entityId: driverId,
        meta: {
          username: usernameInput,
          phone: nextPhone,
          status: statusInput
        }
      });
      const finalVehicle = vehicles.find((x) => safeText5(x?.driverId) === driverId) || null;
      result = {
        id: safeText5(driver.id),
        name: safeText5(driver.name),
        username: safeText5(driver.username),
        phone: safeText5(driver.phone),
        email: safeText5(driver.email),
        status: safeText5(driver.status),
        active: driver.active !== false,
        vehicleType: safeText5(finalVehicle?.vehicleType || finalVehicle?.viechle_cat || ""),
        carName: safeText5(finalVehicle?.model || finalVehicle?.carName || ""),
        vehicleNumber: safeText5(finalVehicle?.vehicleNumber || "")
      };
    }, "admin_driver_update");
    return res.json({ ok: true, driver: result });
  } catch (err) {
    return res.status(400).json({ error: safeText5(err?.message || err) || "DRIVER_UPDATE_FAILED" });
  }
});
adminRouter.post("/cab-bookings/:id/quote", async (req, res) => {
  try {
    const rideId = safeText5(req.params.id);
    const fare = Number(req.body?.fare);
    if (!rideId) return res.status(400).json({ error: "RIDE_ID_REQUIRED" });
    if (!Number.isFinite(fare) || fare <= 0) return res.status(400).json({ error: "INVALID_FARE" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const quotedBy = safeText5(req?.adminUser?.username || req.header("X-EV-Dashboard") || "admin");
    let out = null;
    await mutateData((db) => {
      const anyDb = db;
      const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
      const ride = rides.find((x) => safeText5(x?.id) === rideId);
      if (!ride) throw new Error("RIDE_NOT_FOUND");
      if (safeText5(ride?.paymentStatus).toLowerCase() === "paid") throw new Error("RIDE_ALREADY_PAID");
      const rideStatus = safeText5(ride?.status).toLowerCase();
      if (["cancelled", "completed"].includes(rideStatus)) throw new Error("RIDE_NOT_QUOTABLE");
      ride.bookingMode = "quotes";
      ride.quotedFare = fare;
      ride.quotedAt = now;
      ride.quotedBy = quotedBy;
      ride.quoteStatus = "quoted";
      ride.updatedAt = now;
      if (!Array.isArray(anyDb.auditLog)) anyDb.auditLog = [];
      anyDb.auditLog.push({
        id: makeId("audit"),
        at: now,
        action: "CAB_QUOTE_SENT",
        entity: "cab_booking",
        entityId: rideId,
        meta: { rideId, fare, quotedBy }
      });
      const ridePhone = normalizePhone2(safeText5(ride?.phone || ""));
      const rideEmail = normalizeEmail(safeText5(ride?.email || ""));
      const rideUserId = safeText5(ride?.userId || "");
      if (!Array.isArray(anyDb.userProfiles)) anyDb.userProfiles = [];
      const profile = anyDb.userProfiles.find(
        (u) => !!rideUserId && safeText5(u?.id) === rideUserId || !!ridePhone && normalizePhone2(safeText5(u?.phone || "")) === ridePhone || !!rideEmail && normalizeEmail(safeText5(u?.email || "")) === rideEmail
      );
      if (profile) {
        const route = [safeText5(ride?.pickupLocation), safeText5(ride?.dropLocation)].filter(Boolean).join(" to ");
        const current = Array.isArray(profile.pushNotifications) ? profile.pushNotifications : [];
        profile.pushNotifications = [{
          id: makeId("push"),
          title: "Fare quote ready",
          message: `Our travel desk quoted Rs ${fare} for your ride${route ? ` ${route}` : ""}. Open My Orders to accept and pay.`,
          type: "order_update",
          createdAt: now,
          from: quotedBy
        }, ...current].slice(0, 200);
        profile.updatedAt = now;
      }
      out = { rideId, quotedFare: fare, quotedAt: now, quotedBy, quoteStatus: "quoted" };
    }, "admin_cab_quote");
    return res.json({ ok: true, quote: out });
  } catch (err) {
    const code = safeText5(err?.message) || "CAB_QUOTE_FAILED";
    const status = code === "RIDE_NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ error: code });
  }
});
adminRouter.post("/refunds/status", async (req, res) => {
  try {
    const table = safeText5(req.body?.table || "");
    const orderId = safeText5(req.body?.orderId || "");
    const newStatus = normalizeRefundStatus(req.body?.status);
    const reason = safeText5(req.body?.reason || "");
    if (!REFUND_ORDER_TABLES.includes(table)) {
      return res.status(400).json({ error: "INVALID_REFUND_TABLE" });
    }
    if (!orderId) return res.status(400).json({ error: "ORDER_ID_REQUIRED" });
    const row = await patchOrderRefundStatus(table, orderId, newStatus);
    const action = refundAuditAction(newStatus);
    if (action) {
      try {
        await mutateData((db) => {
          if (!Array.isArray(db.auditLog)) db.auditLog = [];
          db.auditLog.push({
            id: makeId("audit"),
            at: (/* @__PURE__ */ new Date()).toISOString(),
            action,
            entity: "refund",
            entityId: orderId,
            meta: { table, orderId, status: newStatus, reason }
          });
        }, "admin_refund_status_patch");
      } catch {
      }
    }
    return res.json({ ok: true, table, orderId, status: newStatus, row });
  } catch (err) {
    return res.status(500).json({
      error: "REFUND_STATUS_UPDATE_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.post("/supabase/update", async (req, res) => {
  try {
    const table = safeText5(req.body?.table || "");
    const id = safeText5(req.body?.id || "");
    const keyColumn = safeText5(req.body?.keyColumn || defaultConflictColumnForTable(table));
    const rawPatch = req.body?.patch && typeof req.body.patch === "object" && !Array.isArray(req.body.patch) ? req.body.patch : null;
    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(keyColumn)) {
      return res.status(400).json({ error: "INVALID_KEY_COLUMN" });
    }
    if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
    if (!rawPatch) return res.status(400).json({ error: "PATCH_REQUIRED" });
    const patch = {};
    for (const [column, value] of Object.entries(rawPatch)) {
      if (column === keyColumn) continue;
      if (!/^[a-z0-9_]+$/i.test(column)) {
        return res.status(400).json({ error: "INVALID_PATCH_COLUMN", column });
      }
      patch[column] = value;
    }
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "PATCH_REQUIRED", message: "The patch contained no updatable columns." });
    }
    const { url } = assertSupabaseAdminConfigured();
    const filter = `${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(id)}`;
    const patchTable = async (targetTable) => {
      const countEndpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?select=${encodeURIComponent(keyColumn)}&${filter}`;
      const before = await fetch(countEndpoint, { headers: supabaseAdminHeaders() });
      if (!before.ok) return { ok: false, updated: 0, message: await before.text() };
      const existing = await before.json().catch(() => []);
      const matched = Array.isArray(existing) ? existing.length : 0;
      if (!matched) return { ok: true, updated: 0, message: "" };
      const r = await fetch(`${url}/rest/v1/${encodeURIComponent(targetTable)}?${filter}`, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(patch)
      });
      if (!r.ok) return { ok: false, updated: 0, message: await r.text() };
      return { ok: true, updated: matched, message: "" };
    };
    const fallbackTable = fallbackTableForRequestedTable(table);
    const canFallBack = !!fallbackTable && fallbackTable !== table;
    const primary = await patchTable(table);
    if (!primary.ok && !(canFallBack && isMissingRelationErrorMessage(primary.message, table))) {
      return res.status(500).json({ error: "SUPABASE_UPDATE_FAILED", table, message: primary.message });
    }
    if (primary.updated > 0) {
      if (table === FOOD_MENU_ITEM_TABLE2 || table === LEGACY_FOOD_MENU_ITEM_TABLE2) {
        const restaurantId = safeText5(req.body?.restaurantId || "");
        if (restaurantId) {
          try {
            await syncVendorMenuBlobsFromItems([restaurantId]);
          } catch (err) {
            console.error("[admin.supabase.update] vendor menu blob sync failed", {
              table,
              restaurantId,
              message: String(err?.message || err)
            });
          }
        }
      }
      return res.json({ ok: true, table, updated: primary.updated, columns: Object.keys(patch) });
    }
    if (canFallBack) {
      const legacy = await patchTable(fallbackTable);
      if (!legacy.ok) {
        if (!primary.ok) {
          return res.status(500).json({ error: "SUPABASE_UPDATE_FAILED", table: fallbackTable, message: legacy.message });
        }
      } else if (legacy.updated > 0) {
        return res.json({ ok: true, table: fallbackTable, updated: legacy.updated, columns: Object.keys(patch) });
      }
    }
    return res.status(404).json({
      error: "ROW_NOT_FOUND",
      table,
      id,
      keyColumn,
      message: `No ${table} row has ${keyColumn} = "${id}", so nothing was updated.`
    });
  } catch (err) {
    return res.status(500).json({
      error: "SUPABASE_UPDATE_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.post("/supabase/delete", async (req, res) => {
  try {
    const table = safeText5(req.body?.table || "");
    const id = safeText5(req.body?.id || "");
    const keyColumn = safeText5(req.body?.keyColumn || defaultConflictColumnForTable(table));
    const confirmText = safeText5(req.body?.confirmText || "");
    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(keyColumn)) {
      return res.status(400).json({ error: "INVALID_KEY_COLUMN" });
    }
    if (!id) {
      return res.status(400).json({ error: "ID_REQUIRED" });
    }
    if (confirmText !== "DELETE") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Deletion requires explicit confirmation text."
      });
    }
    const { url } = assertSupabaseAdminConfigured();
    const filter = `${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(id)}`;
    const countMatching = async (targetTable) => {
      const endpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?select=${encodeURIComponent(keyColumn)}&${filter}`;
      const r = await fetch(endpoint, { headers: supabaseAdminHeaders() });
      if (!r.ok) return { ok: false, count: 0, message: await r.text() };
      const rows = await r.json().catch(() => []);
      return { ok: true, count: Array.isArray(rows) ? rows.length : 0, message: "" };
    };
    const deleteFrom = async (targetTable) => {
      const before = await countMatching(targetTable);
      if (!before.ok) return { ok: false, deleted: 0, blocked: false, message: before.message };
      if (!before.count) return { ok: true, deleted: 0, blocked: false, message: "" };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?${filter}`;
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
      });
      if (!r.ok) return { ok: false, deleted: 0, blocked: false, message: await r.text() };
      const after = await countMatching(targetTable);
      const remaining = after.ok ? after.count : 0;
      const deleted = Math.max(0, before.count - remaining);
      return { ok: true, deleted, blocked: deleted === 0, message: "" };
    };
    const fallbackTable = fallbackTableForRequestedTable(table);
    const canFallBack = !!fallbackTable && fallbackTable !== table;
    const primary = await deleteFrom(table);
    if (!primary.ok && !(canFallBack && isMissingRelationErrorMessage(primary.message, table))) {
      return res.status(500).json({
        error: "SUPABASE_DELETE_FAILED",
        table,
        message: primary.message
      });
    }
    if (primary.deleted > 0) {
      return res.json({ ok: true, table, deleted: primary.deleted });
    }
    if (primary.blocked) {
      return res.status(500).json({
        error: "SUPABASE_DELETE_BLOCKED",
        table,
        id,
        keyColumn,
        message: `Supabase accepted the delete but ${table} still holds ${keyColumn} = "${id}". Check the table's row-level security policies for the service role.`
      });
    }
    if (canFallBack) {
      const legacy = await deleteFrom(fallbackTable);
      if (!legacy.ok) {
        if (!primary.ok) {
          return res.status(500).json({
            error: "SUPABASE_DELETE_FAILED",
            table: fallbackTable,
            message: legacy.message
          });
        }
      } else if (legacy.deleted > 0) {
        return res.json({ ok: true, table: fallbackTable, deleted: legacy.deleted });
      } else if (legacy.blocked) {
        return res.status(500).json({
          error: "SUPABASE_DELETE_BLOCKED",
          table: fallbackTable,
          id,
          keyColumn,
          message: `Supabase accepted the delete but ${fallbackTable} still holds ${keyColumn} = "${id}". Check the table's row-level security policies for the service role.`
        });
      }
    }
    return res.status(404).json({
      error: "ROW_NOT_FOUND",
      table,
      id,
      keyColumn,
      message: `No ${table} row has ${keyColumn} = "${id}", so nothing was deleted.`
    });
  } catch (err) {
    return res.status(500).json({
      error: "SUPABASE_DELETE_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.get("/invoices/transaction/:table/:transactionId/pdf", async (req, res) => {
  try {
    const table = normalizeInvoiceTransactionTable(req.params.table);
    const transactionId = safeText5(req.params.transactionId);
    const download = safeText5(req.query.download || "").toLowerCase();
    if (!INVOICE_TRANSACTION_TABLES.has(table)) {
      return res.status(400).json({ error: "INVALID_TRANSACTION_TABLE" });
    }
    if (!transactionId) return res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });
    const transaction = await fetchTransactionRow(table, transactionId);
    if (!transaction) return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
    if (isCancelledTransaction(transaction)) {
      return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_CANCELLED" });
    }
    const serviceKey = serviceKeyForTable(table, transaction);
    let invoiceProfile = defaultInvoiceProfile();
    try {
      invoiceProfile = await fetchInvoiceProfileConfig();
    } catch {
      invoiceProfile = defaultInvoiceProfile();
    }
    const vendorDetails = await fetchVendorDetailsForTransaction(table, transaction, invoiceProfile);
    const sellerProfile = mergeSellerProfile(invoiceProfile, serviceKey, vendorDetails);
    const serviceName = transactionServiceName(table, transaction);
    const gstPercent = parseAmount(
      sellerProfile?.gstPercent ?? sellerProfile?.defaultGstPercent ?? invoiceProfile?.defaultGstPercent ?? 5
    );
    const defaultHsn = safeText5(
      sellerProfile?.defaultHsnOrSac || invoiceProfile?.defaultHsnOrSac || "9964"
    );
    const items = normalizeInvoiceItems(table, transaction, serviceName, defaultHsn, gstPercent);
    let invoice = null;
    try {
      invoice = await fetchInvoiceByTransaction(table, transactionId);
    } catch (err) {
      if (!isMissingInvoicesTableError(err)) throw err;
    }
    if (!invoice) {
      try {
        await ensureInvoiceForCompletedTransaction({
          table,
          row: transaction,
          source: "admin_invoice_pdf"
        });
      } catch {
      }
      try {
        invoice = await fetchInvoiceByTransaction(table, transactionId);
      } catch (err) {
        if (!isMissingInvoicesTableError(err)) throw err;
      }
    }
    if (!invoice) {
      invoice = fallbackInvoiceFromTransaction(table, transaction);
    }
    const pdf = await buildInvoicePdfBuffer(invoice, transaction, {
      sellerProfile,
      serviceName,
      items,
      placeOfSupply: safeText5(sellerProfile?.placeOfSupply || "")
    });
    const invoiceNo = safeText5(invoice?.invoice_no || invoice?.id || "invoice");
    const filename = `${invoiceNo}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const disposition = download === "1" || download === "true" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdf);
  } catch (err) {
    return res.status(500).json({
      error: "INVOICE_PDF_FAILED",
      message: String(err?.message || err)
    });
  }
});
adminRouter.post("/ai/form-json", async (req, res) => {
  try {
    const contextKey = safeText5(req.body?.contextKey || "explorevalley").toLowerCase();
    const prompt = safeText5(req.body?.prompt || "");
    const template = req.body?.template && typeof req.body.template === "object" && !Array.isArray(req.body.template) ? req.body.template : {};
    const currentForm = req.body?.currentForm && typeof req.body.currentForm === "object" && !Array.isArray(req.body.currentForm) ? req.body.currentForm : {};
    if (!prompt || prompt.length < 5) {
      return res.status(400).json({ error: "PROMPT_REQUIRED", message: "Please provide more details for generation." });
    }
    if (!Object.keys(template).length) {
      return res.status(400).json({ error: "TEMPLATE_REQUIRED", message: "Template JSON object is required." });
    }
    const client = getAiClient();
    if (!client) {
      return res.status(500).json({
        error: "AI_NOT_CONFIGURED",
        message: "Set OPENAI_API_KEY or OpenRouter_key for AI generation."
      });
    }
    const primaryModel = safeText5(
      process.env.OPENROUTER_AGENT_MODEL || process.env.OPENAI_AGENT_MODEL || process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || "openai/gpt-4o-mini"
    );
    const fallbackModel = safeText5(
      process.env.OPENAI_FALLBACK_MODEL || process.env.OPENAI_SECONDARY_MODEL || "gpt-4.1-mini"
    );
    const system = [
      "You generate strict JSON objects for admin data entry.",
      "Return only a JSON object and nothing else.",
      "Do not include keys that are not in TEMPLATE.",
      "Use values that are realistic and concise.",
      "Keep arrays/objects valid JSON."
    ].join(" ");
    const user = [
      `Context: ${contextKey}`,
      `TEMPLATE: ${JSON.stringify(template)}`,
      `CURRENT_FORM: ${JSON.stringify(currentForm)}`,
      `USER_INSTRUCTIONS: ${prompt}`,
      "Return JSON only."
    ].join("\n");
    let resp;
    let usedModel = primaryModel;
    try {
      resp = await client.chat.completions.create({
        model: primaryModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      });
    } catch (firstErr) {
      const msg = String(firstErr?.message || "");
      const shouldRetry = fallbackModel && fallbackModel !== primaryModel && /does not have access to model|model/i.test(msg);
      if (!shouldRetry) throw firstErr;
      usedModel = fallbackModel;
      resp = await client.chat.completions.create({
        model: fallbackModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      });
    }
    const text = safeText5(resp?.choices?.[0]?.message?.content || "");
    if (!text) return res.status(500).json({ error: "AI_EMPTY_RESPONSE", message: "AI returned empty output." });
    const parsed = JSON.parse(text);
    const json = sanitizeAiPatch(parsed, template);
    return res.json({ ok: true, contextKey, model: usedModel, json });
  } catch (err) {
    return res.status(500).json({ error: "AI_FORM_JSON_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/mart/generate-image", async (req, res) => {
  try {
    const productName = safeText5(req.body?.productName || "");
    const category = safeText5(req.body?.category || "");
    const folder = safeText5(req.body?.folder || "products");
    if (!productName) {
      return res.status(400).json({ error: "PRODUCT_NAME_REQUIRED", message: "Product name is required." });
    }
    const openAiKey = safeText5(process.env.OPENAI_API_KEY || "");
    if (!openAiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY_NOT_CONFIGURED",
        message: "Set OPENAI_API_KEY to generate product images."
      });
    }
    const primaryImageModel = safeText5(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    const fallbackModels = safeText5(process.env.OPENAI_IMAGE_FALLBACK_MODELS || "dall-e-3,dall-e-2").split(",").map((x) => safeText5(x)).filter(Boolean);
    const candidateModels = Array.from(/* @__PURE__ */ new Set([primaryImageModel, ...fallbackModels]));
    const client = new import_openai.default({ apiKey: openAiKey });
    const prompt = [
      `Create a clean studio product photo for: ${productName}.`,
      category ? `Category: ${category}.` : "",
      "The product must look realistic and clearly identifiable.",
      "Single product centered, no people, no hands, no watermark, no text overlay, no logo text.",
      "Plain light background, ecommerce listing style."
    ].filter(Boolean).join(" ");
    let generated = null;
    let usedModel = "";
    const attempts = [];
    for (const model of candidateModels) {
      try {
        generated = await client.images.generate({
          model,
          prompt,
          size: "1024x1024"
        });
        usedModel = model;
        break;
      } catch (modelErr) {
        attempts.push(`${model}: ${String(modelErr?.message || modelErr)}`);
      }
    }
    if (!generated || !usedModel) {
      return res.status(500).json({
        error: "AI_IMAGE_MODEL_UNAVAILABLE",
        message: attempts.join(" | ") || "No image model could be used."
      });
    }
    const b64 = safeText5(generated?.data?.[0]?.b64_json || "");
    let sourceBuffer = null;
    if (b64) {
      sourceBuffer = Buffer.from(b64, "base64");
    } else {
      const remoteUrl = safeText5(generated?.data?.[0]?.url || "");
      if (!remoteUrl) {
        return res.status(500).json({ error: "AI_IMAGE_EMPTY", message: "AI did not return image data." });
      }
      const remoteResp = await fetch(remoteUrl);
      if (!remoteResp.ok) {
        return res.status(500).json({
          error: "AI_IMAGE_DOWNLOAD_FAILED",
          message: `Failed to download generated image: ${remoteResp.status}`
        });
      }
      const arr = await remoteResp.arrayBuffer();
      sourceBuffer = Buffer.from(arr);
    }
    const finalBuffer = await (0, import_sharp.default)(sourceBuffer).rotate().resize(200, 200, { fit: "cover", position: "centre" }).png({ compressionLevel: 9 }).toBuffer();
    const uploaded = await uploadImageBufferToSupabase(
      finalBuffer,
      "image/png",
      folder || "products",
      `${sanitizeFileBaseName(productName)}_ai.png`
    );
    return res.json({
      ok: true,
      model: usedModel,
      productName,
      ...uploaded
    });
  } catch (err) {
    return res.status(500).json({
      error: "MART_AI_IMAGE_GENERATION_FAILED",
      message: String(err?.message || err)
    });
  }
});
async function readJsonArraySafe(filePath) {
  try {
    if (!await import_fs_extra2.default.pathExists(filePath)) return [];
    const raw = await import_fs_extra2.default.readJson(filePath).catch(() => []);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
async function patchCatalogRecord(type, id, patch) {
  let found = false;
  await mutateData((db) => {
    const findAndPatch = (arr, key = "id") => {
      const idx = arr.findIndex((x) => String(x?.[key] || "") === id);
      if (idx < 0) return false;
      arr[idx] = { ...arr[idx], ...patch };
      return true;
    };
    if (type === "tour") found = findAndPatch(db.tours);
    else if (type === "festival") found = findAndPatch(db.festivals);
    else if (type === "hotel" || type === "cottage") found = findAndPatch(db.hotels);
    else if (type === "restaurant") {
      found = findAndPatch(db.restaurants);
      if (!found) {
        const next = {
          id,
          name: String(patch?.name || id),
          description: String(patch?.description || ""),
          cuisine: Array.isArray(patch?.cuisine) ? patch.cuisine : [],
          rating: Number(patch?.rating || 0),
          reviewCount: Number(patch?.reviewCount || 0),
          deliveryTime: String(patch?.deliveryTime || ""),
          minimumOrder: Number(patch?.minimumOrder || 0),
          priceDropped: patch?.priceDropped === true,
          priceDropPercent: Number(patch?.priceDropPercent || 0),
          heroImage: String(patch?.heroImage || ""),
          images: Array.isArray(patch?.images) ? patch.images : [],
          imageTitles: Array.isArray(patch?.imageTitles) ? patch.imageTitles : [],
          imageDescriptions: Array.isArray(patch?.imageDescriptions) ? patch.imageDescriptions : [],
          imageMeta: Array.isArray(patch?.imageMeta) ? patch.imageMeta : [],
          available: patch?.available !== false,
          isVeg: patch?.isVeg === true,
          tags: Array.isArray(patch?.tags) ? patch.tags : [],
          location: String(patch?.location || ""),
          serviceRadiusKm: Number(patch?.serviceRadiusKm || 0),
          deliveryZones: Array.isArray(patch?.deliveryZones) ? patch.deliveryZones : [],
          openHours: String(patch?.openHours || "09:00"),
          closingHours: String(patch?.closingHours || "22:00"),
          menu: Array.isArray(patch?.menu) ? patch.menu : []
        };
        db.restaurants.push(next);
        found = true;
      }
    } else if (type === "food_item") found = findAndPatch(db.menuItems);
    else if (type === "cab") found = findAndPatch(db.cabProviders);
  }, `admin_patch_${type}_${id}`);
  return found;
}
adminRouter.get("/data", async (_req, res) => {
  const db = await readData();
  res.json(db);
});
adminRouter.get("/auth-summary", async (_req, res) => {
  const passwordProfilesPath = import_path4.default.join(process.cwd(), "..", "data", "auth-password-profiles.json");
  const authLogPath = import_path4.default.join(process.cwd(), "..", "data", "auth-logins.json");
  const passwordProfiles = await readJsonArraySafe(passwordProfilesPath);
  const authEvents = await readJsonArraySafe(authLogPath);
  const byUserId = /* @__PURE__ */ new Map();
  const byEmail = /* @__PURE__ */ new Map();
  const byPhone = /* @__PURE__ */ new Map();
  const touch = (target, key, patch) => {
    const k = safeText5(key);
    if (!k) return;
    const curr = target.get(k) || { ...patch };
    const next = { ...curr, ...patch };
    target.set(k, next);
  };
  for (const row of passwordProfiles) {
    const userId = safeText5(row?.userId);
    const email = normalizeEmail(row?.email || "");
    const passwordSet = row?.passwordSet === true;
    const updatedAt = safeText5(row?.updatedAt);
    if (userId) touch(byUserId, userId, { userId, email: email || void 0, passwordSet, passwordUpdatedAt: updatedAt || void 0 });
    if (email) touch(byEmail, email, { userId: userId || void 0, email, passwordSet, passwordUpdatedAt: updatedAt || void 0 });
  }
  const okEvents = /* @__PURE__ */ new Set(["session_sync", "password_login", "otp_verify"]);
  for (const e of authEvents) {
    const ok = e?.ok === true;
    const ev = safeText5(e?.event);
    if (!ok || !okEvents.has(ev)) continue;
    const at = safeText5(e?.at);
    const provider = safeText5(e?.provider);
    const userId = safeText5(e?.userId);
    const phone = normalizePhone2(e?.phone || "");
    const patch = {
      lastAuthAt: at || void 0,
      lastAuthProvider: provider || void 0,
      lastOkEvent: ev || void 0
    };
    const applyProvider = (m, k) => {
      const curr = m.get(k) || {};
      const providers = Array.isArray(curr.providers) ? curr.providers.slice() : [];
      if (provider && !providers.includes(provider)) providers.push(provider);
      const currAt = new Date(curr.lastAuthAt || 0).getTime();
      const nextAt = new Date(at || 0).getTime();
      const newer = Number.isFinite(nextAt) && nextAt >= currAt;
      m.set(k, {
        ...curr,
        ...newer ? patch : {},
        providers
      });
    };
    if (userId) applyProvider(byUserId, userId);
    if (phone) applyProvider(byPhone, phone);
  }
  const toObj = (m) => Object.fromEntries(Array.from(m.entries()));
  res.json({
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    byUserId: toObj(byUserId),
    byEmail: toObj(byEmail),
    byPhone: toObj(byPhone)
  });
});
adminRouter.put("/data", async (req, res) => {
  const body = req.body;
  const allowEmpty = String(req.headers["x-allow-empty-catalog"] || "").toLowerCase() === "true";
  const catalogLooksEmpty = Array.isArray(body?.tours) && body.tours.length === 0 && Array.isArray(body?.hotels) && body.hotels.length === 0 && Array.isArray(body?.restaurants) && body.restaurants.length === 0 && Array.isArray(body?.menuItems) && body.menuItems.length === 0;
  if (catalogLooksEmpty && !allowEmpty) {
    return res.status(400).json({
      error: "EMPTY_CATALOG_BLOCKED",
      message: "Catalog payload is empty. To intentionally clear it, send header x-allow-empty-catalog: true"
    });
  }
  const parsed = DatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_DATASET" });
  }
  const prev = await readData();
  const candidate = parsed.data;
  applyOperationalRules(prev, candidate);
  const saved = await writeData(candidate);
  res.json({
    ok: true,
    counts: {
      tours: saved.tours.length,
      festivals: (saved.festivals || []).length,
      hotels: saved.hotels.length,
      restaurants: saved.restaurants.length,
      menuItems: saved.menuItems.length
    }
  });
});
adminRouter.patch("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});
adminRouter.post("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});
adminRouter.put("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});
adminRouter.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "IMAGE_FILE_REQUIRED" });
    const uploaded = await uploadImageBufferToSupabase(req.file.buffer, req.file.mimetype, req.body?.folder, req.file.originalname);
    return res.json({
      ok: true,
      ...uploaded
    });
  } catch (err) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    if (String(err?.message || "").startsWith("SUPABASE_UPLOAD_FAILED:")) {
      return res.status(500).json({ error: "SUPABASE_UPLOAD_FAILED", message: String(err?.message || "").replace(/^SUPABASE_UPLOAD_FAILED:/, "") });
    }
    return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/upload-images", upload.array("images", 200), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ error: "IMAGE_FILES_REQUIRED" });
    const folder = normalizeUploadFolder(req.body?.folder, "admin");
    const uploaded = [];
    for (const f of files) {
      const out = await uploadImageBufferToSupabase(f.buffer, f.mimetype, folder, safeText5(f.originalname || ""));
      uploaded.push({
        originalName: safeText5(f.originalname || ""),
        ...out
      });
    }
    return res.json({ ok: true, count: uploaded.length, files: uploaded });
  } catch (err) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    if (String(err?.message || "").startsWith("SUPABASE_UPLOAD_FAILED:")) {
      return res.status(500).json({ error: "SUPABASE_UPLOAD_FAILED", message: String(err?.message || "").replace(/^SUPABASE_UPLOAD_FAILED:/, "") });
    }
    return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.use((err, _req, res, next) => {
  if (!(err instanceof import_multer.default.MulterError)) return next(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "FILE_TOO_LARGE",
      message: "Image exceeds upload limit (100MB per file)."
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({
      error: "TOO_MANY_FILES",
      message: "Too many files in one request."
    });
  }
  return res.status(400).json({
    error: "UPLOAD_INVALID",
    message: String(err.message || "Invalid upload payload.")
  });
});
adminRouter.get("/storage/list", async (req, res) => {
  try {
    const prefix = safeText5(req.query?.prefix || "images/");
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit || 200)));
    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    const listUrl = `${supabaseUrlRaw}/storage/v1/object/list/${encodePath(supabaseBucket)}`;
    const r = await fetch(listUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prefix,
        limit,
        offset: 0,
        sortBy: { column: "updated_at", order: "desc" }
      })
    });
    if (!r.ok) {
      return res.status(500).json({ error: "SUPABASE_STORAGE_LIST_FAILED", message: await r.text() });
    }
    const rows = await r.json().catch(() => []);
    const isLikelyImageName = (name, mimeType) => {
      const n = safeText5(name).toLowerCase();
      const m = safeText5(mimeType).toLowerCase();
      if (m.startsWith("image/")) return true;
      return /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)$/i.test(n);
    };
    const files = (Array.isArray(rows) ? rows : []).filter((x) => {
      const n = safeText5(x?.name || "");
      if (!n || n.endsWith("/")) return false;
      return isLikelyImageName(n, safeText5(x?.metadata?.mimetype || x?.metadata?.contentType || ""));
    }).map((x) => {
      const name = safeText5(x?.name || "");
      const objectPath = `${safeText5(prefix).replace(/\/+$/, "")}/${name}`.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
      const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      const meta = x?.metadata && typeof x.metadata === "object" ? x.metadata : {};
      const sizeCandidates = [
        x?.size,
        meta?.size,
        meta?.fileSize,
        meta?.contentLength,
        meta?.length
      ];
      const sizeBytes = sizeCandidates.map((v) => Number(v)).find((n) => Number.isFinite(n) && n >= 0) || 0;
      return {
        name,
        objectPath,
        url: publicUrl,
        updatedAt: safeText5(x?.updated_at || x?.last_accessed_at || ""),
        sizeBytes,
        metadata: meta
      };
    });
    return res.json({ ok: true, bucket: supabaseBucket, prefix, files });
  } catch (err) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage listing requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_LIST_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/storage/delete", async (req, res) => {
  try {
    const rawList = Array.isArray(req.body?.objectPaths) ? req.body.objectPaths : [];
    const single = safeText5(req.body?.objectPath || "");
    const objectPaths = (rawList.length ? rawList : single ? [single] : []).map((x) => safeText5(x).replace(/\\/g, "/").replace(/^\/+/, "")).filter(Boolean);
    if (!objectPaths.length) {
      return res.status(400).json({ error: "OBJECT_PATH_REQUIRED" });
    }
    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    const deleted = [];
    const missing2 = [];
    for (const objectPath of objectPaths) {
      const delUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      const r = await fetch(delUrl, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (!r.ok) {
        const body = await r.text();
        if (r.status === 404 && String(body || "").toLowerCase().includes("not_found")) {
          missing2.push(objectPath);
          continue;
        }
        return res.status(500).json({
          error: "SUPABASE_STORAGE_DELETE_FAILED",
          objectPath,
          message: body
        });
      }
      deleted.push(objectPath);
    }
    return res.json({
      ok: true,
      bucket: supabaseBucket,
      deletedCount: deleted.length,
      missingCount: missing2.length,
      deleted,
      missing: missing2
    });
  } catch (err) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage delete requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_DELETE_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/storage/rename", async (req, res) => {
  try {
    const objectPath = safeText5(req.body?.objectPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const newNameRaw = safeText5(req.body?.newName || "");
    if (!objectPath) return res.status(400).json({ error: "OBJECT_PATH_REQUIRED" });
    if (!newNameRaw) return res.status(400).json({ error: "NEW_NAME_REQUIRED" });
    const slashAt = objectPath.lastIndexOf("/");
    const dir = slashAt >= 0 ? objectPath.slice(0, slashAt + 1) : "";
    const oldFile = slashAt >= 0 ? objectPath.slice(slashAt + 1) : objectPath;
    const oldExtMatch = oldFile.match(/\.([a-zA-Z0-9]+)$/);
    const oldExt = oldExtMatch ? `.${oldExtMatch[1]}` : "";
    const cleaned = newNameRaw.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_\-.]+|[_\-.]+$/g, "");
    if (!cleaned) return res.status(400).json({ error: "INVALID_NEW_NAME" });
    const hasExt = /\.[a-zA-Z0-9]+$/.test(cleaned);
    const finalName = hasExt ? cleaned : `${cleaned}${oldExt}`;
    const destinationKey = `${dir}${finalName}`.replace(/\/{2,}/g, "/");
    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    if (destinationKey === objectPath) {
      const sameUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      return res.json({ ok: true, bucket: supabaseBucket, objectPath, newObjectPath: objectPath, url: sameUrl });
    }
    const moveUrl = `${supabaseUrlRaw}/storage/v1/object/move`;
    const moveResp = await fetch(moveUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bucketId: supabaseBucket,
        sourceKey: objectPath,
        destinationKey
      })
    });
    if (!moveResp.ok) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_RENAME_FAILED",
        objectPath,
        destinationKey,
        message: await moveResp.text()
      });
    }
    const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(destinationKey)}`;
    return res.json({
      ok: true,
      bucket: supabaseBucket,
      objectPath,
      newObjectPath: destinationKey,
      url: publicUrl
    });
  } catch (err) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage rename requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_RENAME_FAILED", message: String(err?.message || err) });
  }
});
async function supabaseAdminDeleteWhere(table, where, keyColumn = "id") {
  const { url } = assertSupabaseAdminConfigured();
  const parts = Object.entries(where).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`);
  if (!parts.length) throw new Error("DELETE_WHERE_REQUIRED");
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?${parts.join("&")}`;
  const r = await fetch(endpoint, {
    method: "DELETE",
    headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
  });
  if (!r.ok) throw new Error(`${table}_DELETE_FAILED:${r.status}:${await r.text()}`);
  return { ok: true, table, keyColumn };
}
adminRouter.post("/food-vendors/delete-vendor", async (req, res) => {
  try {
    const restaurantId = safeText5(req.body?.restaurantId || "");
    const confirmText = safeText5(req.body?.confirmText || "");
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (confirmText !== "DELETE_VENDOR") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Vendor deletion requires explicit confirmation text."
      });
    }
    try {
      await supabaseAdminDeleteWhere(FOOD_MENU_ITEM_TABLE2, { restaurant_id: restaurantId }, "id");
    } catch {
    }
    await supabaseAdminDeleteWhere(LEGACY_FOOD_MENU_ITEM_TABLE2, { restaurant_id: restaurantId }, "id");
    try {
      await supabaseAdminDeleteWhere("ev_vendor_menu", { restaurant_id: restaurantId }, "restaurant_id");
    } catch {
    }
    try {
      await supabaseAdminDeleteWhere(FOOD_VENDOR_MENU_TABLE2, { restaurant_id: restaurantId }, "restaurant_id");
    } catch {
    }
    try {
      await supabaseAdminDeleteWhere(LEGACY_FOOD_VENDOR_MENU_TABLE2, { restaurant_id: restaurantId }, "restaurant_id");
    } catch {
    }
    try {
      await supabaseAdminDeleteWhere(FOOD_VENDOR_TABLE2, { id: restaurantId }, "id");
    } catch {
    }
    await supabaseAdminDeleteWhere(LEGACY_FOOD_VENDOR_TABLE2, { id: restaurantId }, "id");
    return res.json({ ok: true, deleted: { restaurantId } });
  } catch (err) {
    return res.status(500).json({ error: "DELETE_VENDOR_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/food-vendors/:id/credentials", async (req, res) => {
  try {
    const restaurantId = safeText5(req.params.id || "");
    const username = normalizeDriverUsername(req.body?.username);
    const password = safeText5(req.body?.password);
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
    const db = await readData();
    const restaurants = Array.isArray(db.restaurants) ? db.restaurants : [];
    const current = restaurants.find((x) => safeText5(x?.id) === restaurantId);
    if (!current) return res.status(404).json({ error: "RESTAURANT_NOT_FOUND" });
    const currentHash = safeText5(current.passwordHash);
    if (!password && !currentHash) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
    const duplicate = restaurants.find(
      (x) => safeText5(x?.id) !== restaurantId && normalizeDriverUsername(x?.username) === username
    );
    if (duplicate) return res.status(409).json({ error: "USERNAME_ALREADY_IN_USE" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await mutateData((data) => {
      const anyDb = data;
      if (!Array.isArray(anyDb.restaurants)) anyDb.restaurants = [];
      const row = anyDb.restaurants.find((x) => safeText5(x?.id) === restaurantId);
      if (!row) throw new Error("RESTAURANT_NOT_FOUND");
      row.username = username;
      if (password) row.passwordHash = hashDriverPassword(password);
      row.updatedAt = now;
      if (!Array.isArray(anyDb.auditLog)) anyDb.auditLog = [];
      anyDb.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "FOOD_VENDOR_CREDENTIALS_UPDATED",
        entity: "restaurant",
        entityId: restaurantId,
        meta: { username, passwordUpdated: !!password }
      });
    }, "food_vendor_credentials_update");
    return res.json({ ok: true, restaurantId, username, passwordUpdated: !!password });
  } catch (err) {
    return res.status(500).json({ error: "FOOD_VENDOR_CREDENTIALS_UPDATE_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/food-vendors/delete-menu-item", async (req, res) => {
  const restaurantId = safeText5(req.body?.restaurantId || "");
  const itemId = safeText5(req.body?.itemId || req.body?.id || "");
  const itemName = safeText5(req.body?.name || "");
  const itemCategory = safeText5(req.body?.category || "");
  try {
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (!itemId && !itemName) return res.status(400).json({ error: "ITEM_ID_REQUIRED" });
    const { url } = assertSupabaseAdminConfigured();
    const lookupKey = normalizeMenuLookupKey2(itemName, itemCategory);
    const isTarget = (row) => {
      const rowId = safeText5(row?.id || "");
      if (itemId && rowId) return rowId === itemId;
      if (itemId && !rowId) return false;
      return !!itemName && normalizeMenuLookupKey2(row?.name, row?.category) === lookupKey;
    };
    let rowsDeleted = 0;
    let itemTableTouched = false;
    const deleteItemRow = async (tableName) => {
      if (!itemId) return { ok: true, deleted: 0, message: "" };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}?id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
      const before = await fetch(`${endpoint}&select=id`, { headers: supabaseAdminHeaders() });
      if (!before.ok) return { ok: false, deleted: 0, message: await before.text() };
      const existing = await before.json().catch(() => []);
      if (!Array.isArray(existing) || !existing.length) return { ok: true, deleted: 0, message: "" };
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
      });
      if (!r.ok) return { ok: false, deleted: 0, message: await r.text() };
      return { ok: true, deleted: existing.length, message: "" };
    };
    for (const tableName of [FOOD_MENU_ITEM_TABLE2, LEGACY_FOOD_MENU_ITEM_TABLE2]) {
      const result = await deleteItemRow(tableName);
      if (!result.ok) {
        if (isMissingRelationErrorMessage(result.message, tableName)) continue;
        return res.status(500).json({ error: "DELETE_MENU_ITEM_FAILED", table: tableName, message: result.message });
      }
      itemTableTouched = true;
      rowsDeleted += result.deleted;
    }
    let blobsUpdated = 0;
    if (rowsDeleted) {
      try {
        await syncVendorMenuBlobsFromItems([restaurantId]);
        blobsUpdated = 1;
      } catch (err) {
        console.error("[admin.delete-menu-item] vendor menu blob sync failed", {
          restaurantId,
          itemId,
          message: String(err?.message || err)
        });
      }
    } else {
      const pruneBlob = async (tableName, keyColumn, keyValue) => {
        const listEndpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}?select=${encodeURIComponent(keyColumn)},menu&${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(keyValue)}&limit=1`;
        const r = await fetch(listEndpoint, { headers: supabaseAdminHeaders() });
        if (!r.ok) {
          const msg = await r.text();
          if (isMissingRelationErrorMessage(msg, tableName)) return;
          throw new Error(msg);
        }
        const rows = await r.json().catch(() => []);
        const current = Array.isArray(rows) && rows[0] ? rows[0]?.menu : null;
        if (!Array.isArray(current)) return;
        const next = current.filter((row) => !isTarget(row));
        if (next.length === current.length) return;
        const patch = await fetch(
          `${url}/rest/v1/${encodeURIComponent(tableName)}?${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(keyValue)}`,
          {
            method: "PATCH",
            headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
            body: JSON.stringify({ menu: next })
          }
        );
        if (!patch.ok) throw new Error(await patch.text());
        blobsUpdated += 1;
      };
      const blobTargets = [
        ["ev_vendor_menu", "restaurant_id"],
        [FOOD_VENDOR_MENU_TABLE2, "restaurant_id"],
        [LEGACY_FOOD_VENDOR_MENU_TABLE2, "restaurant_id"],
        [FOOD_VENDOR_TABLE2, "id"],
        [LEGACY_FOOD_VENDOR_TABLE2, "id"]
      ];
      for (const [tableName, keyColumn] of blobTargets) {
        try {
          await pruneBlob(tableName, keyColumn, restaurantId);
        } catch (err) {
          return res.status(500).json({
            error: "DELETE_MENU_ITEM_FAILED",
            table: tableName,
            message: String(err?.message || err)
          });
        }
      }
    }
    if (!rowsDeleted && !blobsUpdated) {
      return res.status(404).json({
        error: "MENU_ITEM_NOT_FOUND",
        restaurantId,
        itemId,
        message: `No menu item matched${itemId ? ` id "${itemId}"` : ` "${itemName}"`} for this vendor, so nothing was deleted.`
      });
    }
    return res.json({
      ok: true,
      restaurantId,
      itemId,
      deleted: rowsDeleted,
      menusUpdated: blobsUpdated,
      itemTableTouched
    });
  } catch (err) {
    console.error("[admin.delete-menu-item]", {
      restaurantId,
      itemId,
      message: String(err?.message || err),
      stack: err?.stack || null
    });
    return res.status(500).json({ error: "DELETE_MENU_ITEM_FAILED", message: String(err?.message || err) });
  }
});
adminRouter.post("/food-vendors/replace-menu", async (req, res) => {
  let restaurantId = "";
  let vendorName = "";
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : Array.isArray(req.body?.payload?.items) ? req.body.payload.items : [];
    const allowEmpty = req.body?.allowEmpty === true;
    const restaurantIdFromItems = safeText5(items.find((x) => safeText5(x?.restaurant_id))?.restaurant_id || "");
    restaurantId = safeText5(req.body?.restaurantId || restaurantIdFromItems);
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    vendorName = restaurantId;
    try {
      const vendorRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_VENDOR_TABLE2)}?select=id,name&id=eq.${encodeURIComponent(restaurantId)}&limit=1`
      );
      if (Array.isArray(vendorRows) && vendorRows[0]) {
        vendorName = safeText5(vendorRows[0]?.name || restaurantId) || restaurantId;
      }
    } catch {
      try {
        const vendorRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_TABLE2)}?select=id,name&id=eq.${encodeURIComponent(restaurantId)}&limit=1`
        );
        if (Array.isArray(vendorRows) && vendorRows[0]) {
          vendorName = safeText5(vendorRows[0]?.name || restaurantId) || restaurantId;
        }
      } catch {
      }
    }
    const existingImageById = /* @__PURE__ */ new Map();
    const existingImageByKey = /* @__PURE__ */ new Map();
    const rememberExistingImage = (row) => {
      const image = safeText5(row?.image || row?.hero_image || "");
      if (!image) return;
      const id = safeText5(row?.id || "");
      const key = normalizeMenuLookupKey2(row?.name, row?.category);
      if (id && !existingImageById.has(id)) existingImageById.set(id, image);
      if (key && !existingImageByKey.has(key)) existingImageByKey.set(key, image);
    };
    try {
      const vendorMenuRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_VENDOR_MENU_TABLE2)}?select=menu&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
      );
      const vendorMenu = Array.isArray(vendorMenuRows) && vendorMenuRows[0] ? vendorMenuRows[0]?.menu : [];
      (Array.isArray(vendorMenu) ? vendorMenu : []).forEach(rememberExistingImage);
    } catch {
      try {
        const vendorMenuRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_MENU_TABLE2)}?select=menu&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
        );
        const vendorMenu = Array.isArray(vendorMenuRows) && vendorMenuRows[0] ? vendorMenuRows[0]?.menu : [];
        (Array.isArray(vendorMenu) ? vendorMenu : []).forEach(rememberExistingImage);
      } catch {
      }
    }
    try {
      const menuItemRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_MENU_ITEM_TABLE2)}?select=id,name,category,image,hero_image&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
      );
      (Array.isArray(menuItemRows) ? menuItemRows : []).forEach(rememberExistingImage);
    } catch {
      try {
        const menuItemRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_MENU_ITEM_TABLE2)}?select=id,name,category,image,hero_image&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
        );
        (Array.isArray(menuItemRows) ? menuItemRows : []).forEach(rememberExistingImage);
      } catch {
      }
    }
    const normalizedMenuRows = normalizeMenuItemUpsertRows(items, {
      defaultRestaurantId: restaurantId,
      vendorNameByRestaurantId: /* @__PURE__ */ new Map([[restaurantId, vendorName]])
    });
    const normalized = normalizedMenuRows.rows.map((row) => {
      const id = safeText5(row?.id || "");
      const image = safeText5(row?.image || row?.hero_image || "");
      const preservedImage = image || existingImageById.get(id) || existingImageByKey.get(normalizeMenuLookupKey2(row?.name, row?.category)) || "";
      return canonicalMenuItemRow({
        ...row,
        restaurant_id: restaurantId,
        image: preservedImage,
        hero_image: preservedImage
      }, restaurantId);
    }).filter((row) => safeText5(row?.name || ""));
    if (!normalized.length && !allowEmpty) {
      return res.status(400).json({
        error: "MENU_ITEMS_REQUIRED",
        message: items.length ? "No valid menu items were found. Each item must include a non-empty name." : "At least one menu item is required."
      });
    }
    const normalizedRestaurantMenu = normalized.map((row) => ({
      id: safeText5(row?.id || ""),
      category: safeText5(row?.category || "General"),
      name: safeText5(row?.name || ""),
      description: safeText5(row?.description || ""),
      offer: safeText5(row?.offer || ""),
      image: safeText5(row?.image || row?.hero_image || ""),
      price: Number(row?.price || 0),
      mrp: Math.max(0, Number(row?.mrp || 0) || 0),
      stock: Math.max(0, Number(row?.stock || 0) || 0),
      available: row?.available !== false,
      isVeg: row?.is_veg === true || row?.isVeg === true,
      is_veg: row?.is_veg === true || row?.isVeg === true
    }));
    const { url } = assertSupabaseAdminConfigured();
    const isMissingRelation = (msg, table) => {
      const text = safeText5(msg).toLowerCase();
      return (text.includes("does not exist") || text.includes("could not find the table")) && text.includes(table.toLowerCase());
    };
    const logReplaceMenuError = (stage, details) => {
      console.error("[admin.replace-menu]", {
        stage,
        restaurantId,
        vendorName,
        itemsReceived: Array.isArray(items) ? items.length : 0,
        normalizedCount: normalized.length,
        keyShapes: Array.from(new Set(
          normalized.slice(0, 5).map((row) => Object.keys(row || {}).sort().join(","))
        )),
        sampleRow: normalized[0] || null,
        ...details
      });
    };
    const postRows = async (tableName, rows) => {
      if (!rows.length) return { ok: true };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(rows)
      });
      if (!r.ok) {
        const bodyText = await r.text();
        logReplaceMenuError("postRows_failed", {
          tableName,
          status: r.status,
          response: bodyText
        });
        throw new Error(bodyText);
      }
      return { ok: true };
    };
    const patchRows = async (tableName, where, patch) => {
      const query = Object.entries(where).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`).join("&");
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}?${query}`;
      const r = await fetch(endpoint, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(patch)
      });
      if (!r.ok) {
        const bodyText = await r.text();
        logReplaceMenuError("patchRows_failed", {
          tableName,
          where,
          status: r.status,
          response: bodyText
        });
        throw new Error(bodyText);
      }
      return { ok: true };
    };
    let itemRowsReplaced = false;
    try {
      try {
        await supabaseAdminDeleteWhere(FOOD_MENU_ITEM_TABLE2, { restaurant_id: restaurantId }, "id");
      } catch (err) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("delete_primary_failed", { tableName: FOOD_MENU_ITEM_TABLE2, message: msg });
        if (!isMissingRelation(msg, FOOD_MENU_ITEM_TABLE2)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
      await supabaseAdminUpsertRowsIndividually(FOOD_MENU_ITEM_TABLE2, normalized, "id");
      itemRowsReplaced = true;
    } catch (err) {
      const msg = String(err?.message || err || "");
      logReplaceMenuError("replace_primary_failed", { tableName: FOOD_MENU_ITEM_TABLE2, message: msg });
      if (!isMissingRelation(msg, FOOD_MENU_ITEM_TABLE2)) {
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
      }
      try {
        await supabaseAdminDeleteWhere(LEGACY_FOOD_MENU_ITEM_TABLE2, { restaurant_id: restaurantId }, "id");
        await supabaseAdminUpsertRowsIndividually(LEGACY_FOOD_MENU_ITEM_TABLE2, normalized, "id");
        itemRowsReplaced = true;
      } catch (legacyErr) {
        logReplaceMenuError("replace_legacy_failed", {
          tableName: LEGACY_FOOD_MENU_ITEM_TABLE2,
          message: String(legacyErr?.message || legacyErr || msg)
        });
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: String(legacyErr?.message || legacyErr || msg) });
      }
    }
    const vendorMenuRow = [{
      restaurant_id: restaurantId,
      menu: normalizedRestaurantMenu,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }];
    let vendorMenuStored = false;
    for (const tableName of ["ev_vendor_menu", FOOD_VENDOR_MENU_TABLE2, LEGACY_FOOD_VENDOR_MENU_TABLE2]) {
      try {
        await supabaseAdminDeleteWhere(tableName, { restaurant_id: restaurantId }, "restaurant_id");
      } catch (err) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("vendor_menu_delete_failed", { tableName, message: msg });
        if (!isMissingRelation(msg, tableName)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
      try {
        await postRows(tableName, vendorMenuRow);
        vendorMenuStored = true;
      } catch (err) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("vendor_menu_post_failed", { tableName, message: msg });
        if (!isMissingRelation(msg, tableName)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
    }
    let restaurantMenuStored = false;
    try {
      await patchRows(FOOD_VENDOR_TABLE2, { id: restaurantId }, { menu: normalizedRestaurantMenu });
      restaurantMenuStored = true;
    } catch (err) {
      const msg = String(err?.message || err || "");
      logReplaceMenuError("restaurant_menu_patch_primary_failed", { tableName: FOOD_VENDOR_TABLE2, message: msg });
      if (!isMissingRelation(msg, FOOD_VENDOR_TABLE2)) {
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
      }
      try {
        await patchRows(LEGACY_FOOD_VENDOR_TABLE2, { id: restaurantId }, { menu: normalizedRestaurantMenu });
        restaurantMenuStored = true;
      } catch (legacyErr) {
        const legacyMsg = String(legacyErr?.message || legacyErr || "");
        logReplaceMenuError("restaurant_menu_patch_legacy_failed", { tableName: LEGACY_FOOD_VENDOR_TABLE2, message: legacyMsg });
        if (!isMissingRelation(legacyMsg, LEGACY_FOOD_VENDOR_TABLE2)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: legacyMsg });
        }
      }
    }
    if (!itemRowsReplaced && !vendorMenuStored && !restaurantMenuStored) {
      return res.status(500).json({
        error: "REPLACE_MENU_FAILED",
        message: "No menu storage table available (expected ev_food_menu_items/ev_menu_items, ev_food_vendor_menus/ev_vendor_menus, or ev_food_vendors.menu)."
      });
    }
    return res.json({
      ok: true,
      replaced: normalized.length,
      generatedIds: normalizedMenuRows.generatedIds,
      deduped: normalizedMenuRows.deduped,
      restaurantId,
      vendorName,
      sync: {
        ev_food_menu_items: itemRowsReplaced,
        ev_food_vendor_menus: vendorMenuStored,
        ev_food_vendors_menu: restaurantMenuStored
      }
    });
  } catch (err) {
    console.error("[admin.replace-menu] unhandled", {
      restaurantId,
      vendorName,
      message: String(err?.message || err),
      stack: err?.stack || null
    });
    return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: String(err?.message || err) });
  }
});

// vendor/server/routes/martVendor.ts
var import_express2 = require("express");
var import_jsonwebtoken3 = __toESM(require("jsonwebtoken"));
var import_crypto2 = require("crypto");
var import_multer2 = __toESM(require("multer"));
var import_sharp2 = __toESM(require("sharp"));
var import_path5 = __toESM(require("path"));
init_src();
init_jsondb();
var VENDOR_SESSION_COOKIE = "ev_mart_vendor_session";
var LOGIN_WINDOW_MS = 10 * 60 * 1e3;
var LOGIN_MAX_ATTEMPTS = 6;
var loginFailures = /* @__PURE__ */ new Map();
var upload2 = (0, import_multer2.default)({
  storage: import_multer2.default.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});
function safeText6(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  const s = safeText6(v).toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}
function toMoney2(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}
function toPercent(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}
function toInt2(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}
function parseJsonValue(raw) {
  if (typeof raw !== "string") return raw;
  const text = safeText6(raw);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function parseCustomCategoryList(raw) {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((x) => safeText6(x)).filter(Boolean)));
  }
  const parsed = parseJsonValue(raw);
  if (Array.isArray(parsed)) {
    return Array.from(new Set(parsed.map((x) => safeText6(x)).filter(Boolean)));
  }
  const text = safeText6(raw);
  if (!text) return [];
  return Array.from(new Set(text.split(",").map((x) => safeText6(x)).filter(Boolean)));
}
var CUSTOM_CATEGORY_FIELDS = [
  "inventory_custom_categories",
  "custom_categories",
  "category_options",
  "categories"
];
function resolveCustomCategoryField(row) {
  const src = row && typeof row === "object" ? row : {};
  return CUSTOM_CATEGORY_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(src, field)) || "";
}
function serializeCustomCategoryValue(currentValue, categories) {
  if (typeof currentValue === "string") {
    return JSON.stringify(categories);
  }
  return categories;
}
function normalizeQuantityOption(row, index, fallbackVendorPrice, fallbackCustomerPrice, fallbackMrp, fallbackStock) {
  const src = row && typeof row === "object" ? row : {};
  const label = safeText6(src?.label || src?.name || src?.title || src?.unit || src?.size || src?.capacity);
  if (!label) return null;
  const vendorPrice = toMoney2(src?.vendor_price ?? src?.vendorPrice ?? src?.cost_price ?? src?.costPrice ?? src?.base_price ?? src?.basePrice, fallbackVendorPrice);
  return {
    id: safeText6(src?.id) || `qty_${index + 1}`,
    label,
    unit: safeText6(src?.unit || src?.size || src?.capacity || label),
    value: safeText6(src?.value || ""),
    price: toMoney2(src?.price ?? src?.customer_price ?? src?.customerPrice, fallbackCustomerPrice),
    vendor_price: vendorPrice,
    mrp: toMoney2(src?.mrp, fallbackMrp),
    stock: toInt2(src?.stock, fallbackStock),
    is_default: src?.is_default === void 0 && src?.isDefault === void 0 ? index === 0 : toBool(src?.is_default ?? src?.isDefault, index === 0),
    available: src?.available === void 0 ? true : toBool(src?.available, true)
  };
}
function normalizeQuantityOptions(raw, fallback) {
  const parsed = parseJsonValue(raw);
  const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : [];
  const normalized = list.map((item, index) => normalizeQuantityOption(item, index, fallback.vendorPrice, fallback.price, fallback.mrp, fallback.stock)).filter(Boolean);
  if (normalized.length) {
    return normalized.map((item, index) => ({
      ...item,
      is_default: normalized.some((x) => x.is_default) ? item.is_default : index === 0
    }));
  }
  if (!fallback.unit) return [];
  return [{
    id: "qty_1",
    label: fallback.unit,
    unit: fallback.unit,
    value: "",
    price: fallback.price,
    vendor_price: fallback.vendorPrice,
    mrp: fallback.mrp,
    stock: fallback.stock,
    is_default: true,
    available: true
  }];
}
function hasOwn2(src, key) {
  return !!src && typeof src === "object" && Object.prototype.hasOwnProperty.call(src, key);
}
function syncDefaultQuantityOptionWithLegacyFields(quantityOptions, row) {
  const list = Array.isArray(quantityOptions) ? quantityOptions : [];
  if (!list.length) return list;
  const defaultIndex = Math.max(0, list.findIndex((item) => item?.is_default));
  const legacyUnit = safeText6(row?.unit || row?.capacity || row?.size || "");
  const hasVendorPrice = hasOwn2(row, "price") || hasOwn2(row, "vendor_price") || hasOwn2(row, "vendorPrice");
  const hasCustomerPrice = hasOwn2(row, "customer_price") || hasOwn2(row, "customerPrice") || hasOwn2(row, "selling_price") || hasOwn2(row, "sellingPrice");
  const hasMrp = hasOwn2(row, "mrp");
  const hasStock = hasOwn2(row, "stock");
  return list.map((item, index) => {
    if (index !== defaultIndex) return item;
    return {
      ...item,
      label: legacyUnit || item.label,
      unit: legacyUnit || item.unit || item.label,
      vendor_price: hasVendorPrice ? toMoney2(row?.price ?? row?.vendor_price ?? row?.vendorPrice, item.vendor_price) : item.vendor_price,
      price: hasCustomerPrice ? toMoney2(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, item.price) : item.price,
      mrp: hasMrp ? toMoney2(row?.mrp, item.mrp) : item.mrp,
      stock: hasStock ? toInt2(row?.stock, item.stock) : item.stock,
      is_default: true
    };
  });
}
function normalizeUsername(v) {
  return safeText6(v).toLowerCase();
}
function jwtSecret2() {
  return getMartVendorJwtSecret();
}
function parseCookie(cookieHeader) {
  const out = {};
  safeText6(cookieHeader).split(";").forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = safeText6(k);
    if (!key) return;
    out[key] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
}
function readBearerToken2(req) {
  const auth = safeText6(req?.headers?.authorization || req?.headers?.Authorization || "");
  const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? safeText6(m[1]) : "";
}
function readVendorToken(req) {
  const bearer = readBearerToken2(req);
  if (bearer) return bearer;
  const cookies = parseCookie(safeText6(req?.headers?.cookie || ""));
  return safeText6(cookies[VENDOR_SESSION_COOKIE] || "");
}
function signVendorToken(account) {
  const payload = {
    sub: `${account.vendorId}:${account.username}`,
    role: "mart_vendor",
    vendorId: account.vendorId,
    username: account.username
  };
  return import_jsonwebtoken3.default.sign(payload, jwtSecret2(), { expiresIn: "12h" });
}
function verifyVendorToken(token) {
  try {
    const decoded = import_jsonwebtoken3.default.verify(token, jwtSecret2());
    if (!decoded || decoded.role !== "mart_vendor") return null;
    const vendorId = safeText6(decoded.vendorId);
    const username = normalizeUsername(decoded.username);
    if (!vendorId || !username) return null;
    return {
      sub: safeText6(decoded.sub || `${vendorId}:${username}`),
      role: "mart_vendor",
      vendorId,
      username
    };
  } catch {
    return null;
  }
}
function cookieSecure() {
  return safeText6(process.env.NODE_ENV).toLowerCase() === "production";
}
function setVendorSessionCookie(res, token) {
  res.cookie(VENDOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1e3,
    path: "/api/mart-vendor"
  });
}
function clearVendorSessionCookie(res) {
  res.clearCookie(VENDOR_SESSION_COOKIE, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/api/mart-vendor"
  });
}
function accountFromRaw(raw) {
  const vendorId = safeText6(raw?.vendorId || raw?.vendor_id || raw?.mart_partner_id || raw?.martId || raw?.id);
  const username = normalizeUsername(raw?.username || raw?.userName || raw?.email || raw?.login);
  if (!vendorId || !username) return null;
  const password = safeText6(raw?.password);
  const passwordHash = safeText6(raw?.passwordHash || raw?.password_hash);
  const activeRaw = raw?.active !== void 0 ? raw?.active : raw?.available;
  return {
    vendorId,
    username,
    password: password || void 0,
    passwordHash: passwordHash || void 0,
    name: safeText6(raw?.name || raw?.vendorName || raw?.displayName) || void 0,
    active: activeRaw === void 0 ? true : toBool(activeRaw, true)
  };
}
function parseVendorAccounts() {
  const parsed = [];
  const raw = safeText6(process.env.MART_VENDOR_ACCOUNTS || process.env.MART_VENDOR_USERS || "");
  if (raw) {
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) {
        json.forEach((entry) => {
          const account = accountFromRaw(entry);
          if (account) parsed.push(account);
        });
      }
    } catch {
    }
  }
  const single = accountFromRaw({
    vendorId: process.env.MART_VENDOR_ID,
    username: process.env.MART_VENDOR_USERNAME,
    password: process.env.MART_VENDOR_PASSWORD,
    passwordHash: process.env.MART_VENDOR_PASSWORD_HASH,
    name: process.env.MART_VENDOR_NAME,
    active: process.env.MART_VENDOR_ACTIVE
  });
  if (single) parsed.push(single);
  const byUsername = /* @__PURE__ */ new Map();
  parsed.forEach((account) => {
    byUsername.set(normalizeUsername(account.username), account);
  });
  return Array.from(byUsername.values()).filter((x) => x.active !== false);
}
async function loadVendorAccountsFromDb() {
  if (!supabaseConfigured2()) return [];
  try {
    const r = await supabaseRequest(
      "ev_mart_partners?select=id,name,username,password,password_hash,active,available,created_at,updated_at&order=updated_at.desc.nullslast&limit=1000"
    );
    const rows = await r.json().catch(() => []);
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(rows) ? rows : []).forEach((raw) => {
      const account = accountFromRaw(raw);
      if (!account || account.active === false) return;
      const key = normalizeUsername(account.username);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(account);
    });
    return out;
  } catch {
    return [];
  }
}
async function resolveVendorAccounts() {
  const dbAccounts = await loadVendorAccountsFromDb();
  if (dbAccounts.length) return dbAccounts;
  return parseVendorAccounts();
}
function comparePlain2(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  try {
    return (0, import_crypto2.timingSafeEqual)(aa, bb);
  } catch {
    return false;
  }
}
function verifyPassword(password, account) {
  const plain = safeText6(account.password);
  if (plain) return comparePlain2(password, plain);
  const hash = safeText6(account.passwordHash);
  if (!hash) return false;
  if (hash.startsWith("sha256$")) {
    const expectedHex = hash.slice("sha256$".length);
    const digest = (0, import_crypto2.createHash)("sha256").update(password).digest("hex");
    return comparePlain2(digest, expectedHex);
  }
  if (hash.startsWith("scrypt$")) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const expectedHex = parts[2];
    const derived = (0, import_crypto2.scryptSync)(password, Buffer.from(saltHex, "hex"), 32).toString("hex");
    return comparePlain2(derived, expectedHex);
  }
  return comparePlain2(password, hash);
}
function supabaseUrl5() {
  return safeText6(process.env.SUPABASE_URL).replace(/\/+$/, "");
}
function supabaseServiceRoleKey4() {
  return safeText6(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}
function supabaseConfigured2() {
  return !!supabaseUrl5() && !!supabaseServiceRoleKey4();
}
function encodePath2(value) {
  return String(value || "").split("/").map((x) => encodeURIComponent(x)).join("/");
}
function normalizeUploadFolder2(raw, fallback = "images/mart-vendor") {
  const folder = String(raw || fallback).replace(/[^a-zA-Z0-9/_-]/g, "");
  return folder || fallback;
}
function sanitizeFileBaseName2(rawName) {
  const input = safeText6(rawName);
  const noExt = input.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = noExt.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_\-.]+|[_\-.]+$/g, "");
  return cleaned || `upload_${Date.now()}`;
}
function makeUploadFileName2(mimeType, originalName) {
  const baseName = sanitizeFileBaseName2(originalName);
  const isPng = safeText6(mimeType).toLowerCase() === "image/png";
  const ext = isPng ? "png" : "jpg";
  return { baseName, ext };
}
function isAllowedUploadImage(file) {
  const mime = safeText6(file?.mimetype).toLowerCase();
  const name = safeText6(file?.originalname).toLowerCase();
  const allowedMime = /* @__PURE__ */ new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/avif"
  ]);
  if (allowedMime.has(mime)) return true;
  return /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(name);
}
async function normalizeUploadImage2(buffer, mimeType) {
  const lower = safeText6(mimeType).toLowerCase();
  if (lower === "image/png") {
    return {
      contentType: "image/png",
      body: await (0, import_sharp2.default)(buffer).rotate().png({ compressionLevel: 9 }).toBuffer()
    };
  }
  return {
    contentType: "image/jpeg",
    body: await (0, import_sharp2.default)(buffer).rotate().jpeg({ quality: 85 }).toBuffer()
  };
}
function getSupabaseStorageConfig2() {
  const supabaseUrlRaw = safeText6(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseKey = safeText6(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
  const supabaseBucket = safeText6(process.env.SUPABASE_STORAGE_BUCKET || "");
  if (!supabaseUrlRaw || !supabaseKey || !supabaseBucket) throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  return { supabaseUrlRaw, supabaseKey, supabaseBucket };
}
async function uploadImageBufferToSupabase2(buffer, mimeType, folderRaw, originalName) {
  const folder = normalizeUploadFolder2(folderRaw, "images/mart-vendor");
  const { baseName, ext } = makeUploadFileName2(mimeType, originalName);
  const { contentType, body } = await normalizeUploadImage2(buffer, mimeType);
  const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig2();
  let objectPath = "";
  let uploaded = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const filename = `${baseName}${suffix}.${ext}`;
    objectPath = import_path5.default.join(folder, filename).replace(/\\/g, "/");
    const uploadUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath2(supabaseBucket)}/${encodePath2(objectPath)}`;
    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": contentType
      },
      body
    });
    if (uploadResp.ok) {
      uploaded = true;
      break;
    }
    const text = await uploadResp.text();
    lastErr = text;
    if (uploadResp.status === 409 || /already exists|duplicate/i.test(text)) continue;
    throw new Error(`SUPABASE_UPLOAD_FAILED:${text}`);
  }
  if (!uploaded || !objectPath) throw new Error(`SUPABASE_UPLOAD_FAILED:${lastErr || "UNABLE_TO_RESOLVE_FILENAME"}`);
  const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath2(supabaseBucket)}/${encodePath2(objectPath)}`;
  return { ok: true, url: publicUrl, path: objectPath, bucket: supabaseBucket };
}
function supabaseHeaders3(extra) {
  const key = supabaseServiceRoleKey4();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra || {}
  };
}
async function supabaseRequest(path8, init) {
  const endpoint = `${supabaseUrl5()}/rest/v1/${path8.replace(/^\/+/, "")}`;
  const r = await fetch(endpoint, {
    ...init || {},
    headers: {
      ...supabaseHeaders3(),
      ...init?.headers || {}
    }
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(txt || "SUPABASE_REQUEST_FAILED");
  }
  return r;
}
async function supabaseSelectAll2(path8, pageSize = 1e3, maxPages = 200) {
  const out = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const join = path8.includes("?") ? "&" : "?";
    const pagePath = `${path8}${join}limit=${pageSize}&offset=${offset}`;
    const r = await supabaseRequest(pagePath);
    const rows = await r.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [];
    if (!arr.length) break;
    out.push(...arr);
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}
async function loadVendorSnapshot(vendorId) {
  const buildCatalog = (rows) => {
    const byName = /* @__PURE__ */ new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const name = safeText6(row?.name || row?.title);
      if (!name) return;
      const key = name.toLowerCase();
      const image = safeText6(row?.image || row?.image_url || row?.imageUrl || "");
      const prev = byName.get(key);
      if (!prev) {
        byName.set(key, { name, image });
        return;
      }
      if (!prev.image && image) {
        byName.set(key, { ...prev, image });
      }
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  };
  if (supabaseConfigured2()) {
    const vendorQ = `ev_mart_partners?select=*&id=eq.${encodeURIComponent(vendorId)}&limit=1`;
    const productQ = `ev_mart_products?select=*&mart_partner_id=eq.${encodeURIComponent(vendorId)}&order=created_at.desc.nullslast`;
    const catalogQ = "ev_mart_products?select=name,image";
    const [vendorRes, products2, catalogRows] = await Promise.all([
      supabaseRequest(vendorQ),
      supabaseSelectAll2(productQ, 1e3),
      supabaseSelectAll2(catalogQ, 1e3)
    ]);
    const vendors2 = await vendorRes.json().catch(() => []);
    return {
      vendor: vendors2[0] || { id: vendorId, name: vendorId },
      products: Array.isArray(products2) ? products2 : [],
      catalog: buildCatalog(catalogRows)
    };
  }
  const db = await readData();
  const anyDb = db;
  const vendors = Array.isArray(anyDb.martPartners) ? anyDb.martPartners : [];
  const products = Array.isArray(anyDb.martProducts) ? anyDb.martProducts : [];
  const vendor = vendors.find((x) => safeText6(x?.id) === vendorId) || { id: vendorId, name: vendorId };
  const filtered = products.filter((x) => {
    const pVendorId = safeText6(x?.mart_partner_id || x?.martId || x?.mart_id);
    return pVendorId === vendorId;
  });
  return { vendor, products: filtered, catalog: buildCatalog(products) };
}
async function saveVendorCustomCategories(vendorId, categories) {
  const normalized = parseCustomCategoryList(categories);
  if (supabaseConfigured2()) {
    const vendorQ = `ev_mart_partners?select=*&id=eq.${encodeURIComponent(vendorId)}&limit=1`;
    const vendorRes = await supabaseRequest(vendorQ);
    const vendors = await vendorRes.json().catch(() => []);
    const vendor = vendors[0];
    if (!vendor) throw new Error("VENDOR_NOT_FOUND");
    const customCategoryField = resolveCustomCategoryField(vendor);
    if (!customCategoryField) {
      throw new Error("Missing custom category column on ev_mart_partners. Add inventory_custom_categories (or custom_categories/category_options/categories).");
    }
    const payload = {
      ...vendor,
      id: vendorId,
      [customCategoryField]: serializeCustomCategoryValue(vendor?.[customCategoryField], normalized)
    };
    await supabaseRequest("ev_mart_partners?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([payload])
    });
    return normalized;
  }
  await mutateData((db) => {
    const anyDb = db;
    if (!Array.isArray(anyDb.martPartners)) anyDb.martPartners = [];
    const rows = anyDb.martPartners;
    const idx = rows.findIndex((row) => safeText6(row?.id) === vendorId);
    if (idx === -1) {
      rows.push({ id: vendorId, name: vendorId, inventory_custom_categories: normalized });
      return;
    }
    const current = rows[idx] || {};
    const customCategoryField = resolveCustomCategoryField(current) || "inventory_custom_categories";
    rows[idx] = {
      ...current,
      [customCategoryField]: serializeCustomCategoryValue(current?.[customCategoryField], normalized)
    };
  }, "mart_vendor_custom_categories");
  return normalized;
}
function sanitizeProductRow(vendorId, row) {
  const id = safeText6(row?.id || "");
  const name = safeText6(row?.name || row?.title);
  if (!name) throw new Error("PRODUCT_NAME_REQUIRED");
  const vendorPrice = toMoney2(row?.price ?? row?.vendor_price ?? row?.vendorPrice, 0);
  const customerPrice = toMoney2(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, vendorPrice);
  const evPercentage = toPercent(row?.ev_percentage ?? row?.evPercent ?? row?.ev_percent, 0);
  const categoryIcon = safeText6(row?.category_icon || row?.categoryIcon || "");
  const categoryImage = safeText6(row?.category_image || row?.categoryImage || row?.category_img || row?.categoryImg || "");
  const baseTags = Array.isArray(row?.tags) ? row.tags : safeText6(row?.tags).split(",").map((x) => x.trim()).filter(Boolean);
  const tagsWithoutCategoryMedia = baseTags.filter((tag) => {
    const normalized = safeText6(tag).toLowerCase();
    return !normalized.startsWith("caticon:") && !normalized.startsWith("catimage:");
  });
  const tags = [
    ...tagsWithoutCategoryMedia,
    ...categoryIcon ? [`caticon:${categoryIcon}`] : [],
    ...categoryImage ? [`catimage:${categoryImage}`] : []
  ];
  const unit = safeText6(row?.unit || row?.capacity || row?.size || "");
  const mrp = toMoney2(row?.mrp, 0);
  const stock = toInt2(row?.stock, 0);
  const quantityOptions = syncDefaultQuantityOptionWithLegacyFields(
    normalizeQuantityOptions(
      row?.quantity_options ?? row?.quantityOptions ?? row?.variants,
      { unit, vendorPrice, price: customerPrice, mrp, stock }
    ),
    row
  );
  const defaultQuantityOption = quantityOptions.find((item) => item?.is_default) || quantityOptions[0] || null;
  return {
    id: id || makeId("mprod"),
    mart_partner_id: vendorId,
    name,
    category_id: safeText6(row?.category_id || row?.categoryId || "uncategorized") || "uncategorized",
    unit,
    sub_category: safeText6(row?.sub_category || row?.subCategory || ""),
    description: safeText6(row?.description || ""),
    price: toMoney2(defaultQuantityOption?.vendor_price, vendorPrice),
    ev_percentage: evPercentage,
    customer_price: toMoney2(defaultQuantityOption?.price, customerPrice),
    mrp: toMoney2(defaultQuantityOption?.mrp, mrp),
    stock: toInt2(defaultQuantityOption?.stock, stock),
    max_per_order: toInt2(row?.max_per_order ?? row?.maxPerOrder, 10) || 10,
    is_veg: toBool(row?.is_veg ?? row?.isVeg, false),
    available: row?.available === void 0 ? true : toBool(row?.available, true),
    image: safeText6(row?.image || ""),
    brand: safeText6(row?.brand || ""),
    tags,
    delivery_pincodes: safeText6(row?.delivery_pincodes || row?.deliveryPincodes || ""),
    type: safeText6(row?.type || ""),
    rating: toMoney2(row?.rating, 0),
    category_icon: categoryIcon,
    category_image: categoryImage,
    quantity_options: quantityOptions
  };
}
function getLoginKey(req, username) {
  const ip = safeText6(req?.ip || req?.headers?.["x-forwarded-for"] || "unknown");
  return `${ip}:${normalizeUsername(username)}`;
}
function checkLoginLock(req, username) {
  const key = getLoginKey(req, username);
  const rec = loginFailures.get(key);
  if (!rec) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (rec.lockUntil > now) return { locked: true, retryAfterMs: rec.lockUntil - now };
  if (now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return { locked: false, retryAfterMs: 0 };
  }
  return { locked: false, retryAfterMs: 0 };
}
function noteLoginFailure(req, username) {
  const key = getLoginKey(req, username);
  const now = Date.now();
  const rec = loginFailures.get(key);
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: now, lockUntil: 0 });
    return;
  }
  const nextCount = rec.count + 1;
  const lockUntil = nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_WINDOW_MS : 0;
  loginFailures.set(key, { count: nextCount, firstAt: rec.firstAt, lockUntil });
}
function clearLoginFailure(req, username) {
  loginFailures.delete(getLoginKey(req, username));
}
function requireVendorAuth(req, res, next) {
  const token = readVendorToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_REQUIRED" });
  const claims = verifyVendorToken(token);
  if (!claims) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_INVALID" });
  req.vendorAuth = claims;
  return next();
}
function martVendorRouter() {
  const r = (0, import_express2.Router)();
  r.get("/auth/session", (req, res) => {
    const token = readVendorToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_REQUIRED" });
    const claims = verifyVendorToken(token);
    if (!claims) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_INVALID" });
    return res.json({ ok: true, vendorId: claims.vendorId, username: claims.username });
  });
  r.post("/auth/login", async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = safeText6(req.body?.password || "");
    if (!username || !password) return res.status(400).json({ ok: false, error: "USERNAME_PASSWORD_REQUIRED" });
    const lock = checkLoginLock(req, username);
    if (lock.locked) {
      return res.status(429).json({
        ok: false,
        error: "TOO_MANY_ATTEMPTS",
        retryAfterSeconds: Math.ceil(lock.retryAfterMs / 1e3)
      });
    }
    const accounts = await resolveVendorAccounts();
    const account = accounts.find((x) => normalizeUsername(x.username) === username && x.active !== false);
    if (!account || !verifyPassword(password, account)) {
      noteLoginFailure(req, username);
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }
    clearLoginFailure(req, username);
    const token = signVendorToken(account);
    setVendorSessionCookie(res, token);
    return res.json({
      ok: true,
      token,
      vendorId: account.vendorId,
      username: account.username,
      name: account.name || account.vendorId
    });
  });
  r.post("/auth/logout", (req, res) => {
    clearVendorSessionCookie(res);
    return res.json({ ok: true });
  });
  r.get("/snapshot", requireVendorAuth, async (req, res) => {
    const claims = req.vendorAuth;
    try {
      const data = await loadVendorSnapshot(claims.vendorId);
      return res.json({
        ok: true,
        vendor: data.vendor,
        products: data.products,
        catalog: data.catalog
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "SNAPSHOT_FAILED", message: String(err?.message || err) });
    }
  });
  r.post("/custom-categories", requireVendorAuth, async (req, res) => {
    const claims = req.vendorAuth;
    try {
      const categories = parseCustomCategoryList(req.body?.categories);
      const saved = await saveVendorCustomCategories(claims.vendorId, categories);
      return res.json({ ok: true, categories: saved });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "CUSTOM_CATEGORIES_SAVE_FAILED", message: String(err?.message || err) });
    }
  });
  r.post("/products/upsert", requireVendorAuth, async (req, res) => {
    const claims = req.vendorAuth;
    const rowsIn = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rowsIn.length) return res.status(400).json({ ok: false, error: "ROWS_REQUIRED" });
    let rows = [];
    try {
      rows = rowsIn.map((row) => sanitizeProductRow(claims.vendorId, row));
    } catch (err) {
      return res.status(400).json({ ok: false, error: safeText6(err?.message || "INVALID_ROW") || "INVALID_ROW" });
    }
    try {
      if (supabaseConfigured2()) {
        const existingOwnerById = /* @__PURE__ */ new Map();
        const idsToCheck = Array.from(
          new Set(rows.map((row) => safeText6(row?.id)).filter(Boolean))
        );
        for (const id of idsToCheck) {
          const chk = await supabaseRequest(
            `ev_mart_products?select=id,mart_partner_id&id=eq.${encodeURIComponent(id)}&limit=1`
          );
          const found = await chk.json().catch(() => []);
          const owner = safeText6(found?.[0]?.mart_partner_id);
          if (owner) existingOwnerById.set(id, owner);
        }
        const usedIds = /* @__PURE__ */ new Set();
        const normalizedRows = rows.map((row) => {
          let nextId = safeText6(row?.id) || makeId("mprod");
          while (usedIds.has(nextId) || existingOwnerById.has(nextId) && existingOwnerById.get(nextId) !== claims.vendorId) {
            nextId = makeId("mprod");
          }
          usedIds.add(nextId);
          return { ...row, id: nextId, mart_partner_id: claims.vendorId };
        });
        const r2 = await supabaseRequest("ev_mart_products?on_conflict=id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(normalizedRows)
        });
        const payload = await r2.json().catch(() => []);
        return res.json({ ok: true, rows: Array.isArray(payload) ? payload : normalizedRows });
      }
      await mutateData((db) => {
        const anyDb = db;
        if (!Array.isArray(anyDb.martProducts)) anyDb.martProducts = [];
        const nextRows = anyDb.martProducts;
        const byVendorAndId = new Map(
          nextRows.map((x, idx) => [
            `${safeText6(x?.mart_partner_id || x?.martId || x?.mart_id)}::${safeText6(x?.id)}`,
            idx
          ])
        );
        rows.forEach((row) => {
          let id = safeText6(row?.id) || makeId("mprod");
          while (byVendorAndId.has(`${claims.vendorId}::${id}`)) {
            const existingIdx = byVendorAndId.get(`${claims.vendorId}::${id}`);
            const existing = existingIdx === void 0 ? null : nextRows[existingIdx];
            if (safeText6(existing?.id) === id) break;
            id = makeId("mprod");
          }
          const key = `${claims.vendorId}::${id}`;
          const idx = byVendorAndId.get(key);
          if (idx === void 0) {
            nextRows.push({ ...row, id, martId: claims.vendorId, mart_partner_id: claims.vendorId });
            byVendorAndId.set(key, nextRows.length - 1);
          } else {
            nextRows[idx] = { ...nextRows[idx] || {}, ...row, id, martId: claims.vendorId, mart_partner_id: claims.vendorId };
          }
        });
      }, "mart_vendor_products_upsert");
      return res.json({ ok: true, rows });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "UPSERT_FAILED", message: String(err?.message || err) });
    }
  });
  r.post("/products/delete", requireVendorAuth, async (req, res) => {
    const claims = req.vendorAuth;
    const id = safeText6(req.body?.id);
    if (!id) return res.status(400).json({ ok: false, error: "PRODUCT_ID_REQUIRED" });
    try {
      if (supabaseConfigured2()) {
        await supabaseRequest(`ev_mart_products?id=eq.${encodeURIComponent(id)}&mart_partner_id=eq.${encodeURIComponent(claims.vendorId)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      } else {
        await mutateData((db) => {
          const anyDb = db;
          const rows = Array.isArray(anyDb.martProducts) ? anyDb.martProducts : [];
          anyDb.martProducts = rows.filter((row) => {
            const rowId = safeText6(row?.id);
            const rowVendor = safeText6(row?.mart_partner_id || row?.martId || row?.mart_id);
            if (rowId !== id) return true;
            return rowVendor !== claims.vendorId;
          });
        }, "mart_vendor_products_delete");
      }
      return res.json({ ok: true, id });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "DELETE_FAILED", message: String(err?.message || err) });
    }
  });
  r.post("/products/upload-image", requireVendorAuth, upload2.single("image"), async (req, res) => {
    const claims = req.vendorAuth;
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ ok: false, error: "IMAGE_FILE_REQUIRED" });
      if (!isAllowedUploadImage(file)) {
        return res.status(400).json({ ok: false, error: "INVALID_IMAGE_TYPE", message: "Only JPG, PNG, WEBP, HEIC, HEIF, AVIF are allowed." });
      }
      const folder = `images/mart-vendor/${encodeURIComponent(claims.vendorId)}`;
      const uploaded = await uploadImageBufferToSupabase2(file.buffer, file.mimetype, folder, safeText6(file.originalname));
      return res.json(uploaded);
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
        return res.status(500).json({
          ok: false,
          error: "SUPABASE_STORAGE_NOT_CONFIGURED",
          message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
        });
      }
      if (msg.startsWith("SUPABASE_UPLOAD_FAILED:")) {
        return res.status(500).json({
          ok: false,
          error: "SUPABASE_UPLOAD_FAILED",
          message: msg.replace(/^SUPABASE_UPLOAD_FAILED:/, "")
        });
      }
      return res.status(500).json({ ok: false, error: "UPLOAD_FAILED", message: msg || "Upload failed." });
    }
  });
  r.post("/auth/hash", (req, res) => {
    const password = safeText6(req.body?.password || "");
    const managerKey = safeText6(req.body?.managerKey || req.headers["x-manager-key"] || "");
    const expected = safeText6(process.env.MART_VENDOR_HASH_KEY || process.env.ADMIN_DASHBOARD_KEY || "");
    if (!expected || managerKey !== expected) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    if (!password) return res.status(400).json({ ok: false, error: "PASSWORD_REQUIRED" });
    const salt = (0, import_crypto2.randomBytes)(16).toString("hex");
    const hash = (0, import_crypto2.scryptSync)(password, Buffer.from(salt, "hex"), 32).toString("hex");
    return res.json({ ok: true, passwordHash: `scrypt$${salt}$${hash}` });
  });
  return r;
}

// vendor/server/routes/delivery.ts
var import_express3 = require("express");
var import_zod3 = require("zod");
init_jsondb();
init_src();

// vendor/server/services/email.ts
init_src();
function orderStatusUpdateHtml(opts) {
  const statusColors = {
    confirmed: "#6ACB47",
    processing: "#3b82f6",
    picked_up: "#f59e0b",
    in_transit: "#8b5cf6",
    delivered: "#6ACB47",
    completed: "#6ACB47",
    cancelled: "#ef4444"
  };
  const color = statusColors[opts.status] || "#666";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8f9fa; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Order Update</h2>
    <p>Hi <strong>${opts.name}</strong>,</p>
    <p>Your ${opts.orderType} order <strong>${opts.orderId}</strong> has been updated:</p>
    <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background: ${color}15; border-left: 4px solid ${color};">
      <div style="font-size: 18px; font-weight: 700; color: ${color}; text-transform: capitalize;">${opts.status.replace(/_/g, " ")}</div>
      <div style="margin-top: 8px; color: #333;">${opts.message}</div>
    </div>
    <p style="color: #666;">Track your order anytime in the ExploreValley app.</p>
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      ExploreValley &middot; Kullu Valley, Himachal Pradesh
    </div>
  </div>
</body>
</html>`;
}
var EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "log").trim().toLowerCase();
async function sendViaSMTP(payload) {
  console.log(`[EMAIL:SMTP] Would send to ${payload.to}: ${payload.subject}`);
  return { ok: true, id: makeId("email") };
}
async function sendViaSES(payload) {
  console.log(`[EMAIL:SES] Would send to ${payload.to}: ${payload.subject}`);
  return { ok: true, id: makeId("email") };
}
async function sendEmail(payload) {
  const id = makeId("email");
  try {
    if (EMAIL_PROVIDER === "smtp") {
      return await sendViaSMTP(payload);
    }
    if (EMAIL_PROVIDER === "ses") {
      return await sendViaSES(payload);
    }
    console.log(`[EMAIL:LOG] To: ${payload.to} | Subject: ${payload.subject} | Template: ${payload.template || "custom"}`);
    return { ok: true, id };
  } catch (err) {
    console.error(`[EMAIL:ERROR]`, err);
    return { ok: false, id, error: String(err?.message || err) };
  }
}
async function sendOrderStatusEmail(opts) {
  return sendEmail({
    to: opts.email,
    toName: opts.name,
    subject: `Order Update - ${opts.orderId} (${opts.status})`,
    bodyHtml: orderStatusUpdateHtml(opts),
    template: "status_update",
    orderId: opts.orderId
  });
}

// vendor/server/services/vendorMessaging.ts
init_src();
var WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || "log").trim().toLowerCase();
async function sendViaTwilio(payload) {
  console.log(`[WHATSAPP:TWILIO] Would send to ${payload.vendorMobile}: ${payload.content.slice(0, 80)}...`);
  return { ok: true, id: makeId("vmsg") };
}
async function sendViaMeta(payload) {
  console.log(`[WHATSAPP:META] Would send to ${payload.vendorMobile}: ${payload.content.slice(0, 80)}...`);
  return { ok: true, id: makeId("vmsg") };
}
async function sendVendorWhatsApp(payload) {
  const id = makeId("vmsg");
  try {
    if (WHATSAPP_PROVIDER === "twilio") return await sendViaTwilio(payload);
    if (WHATSAPP_PROVIDER === "meta") return await sendViaMeta(payload);
    console.log(`[WHATSAPP:LOG] To: ${payload.vendorMobile} (${payload.vendorName}) | Type: ${payload.messageType} | Order: ${payload.orderId}`);
    console.log(`[WHATSAPP:LOG] Content: ${payload.content}`);
    return { ok: true, id };
  } catch (err) {
    console.error(`[WHATSAPP:ERROR]`, err);
    return { ok: false, id, error: String(err?.message || err) };
  }
}
function orderStatusMessage(opts) {
  return `\u{1F4CB} Order Update: ${opts.orderId}
Status: ${opts.status.toUpperCase().replace(/_/g, " ")}
${opts.notes ? `Note: ${opts.notes}` : ""}`;
}
async function notifyVendorStatusUpdate(opts) {
  const content = orderStatusMessage({ orderId: opts.orderId, status: opts.status, notes: opts.notes });
  return sendVendorWhatsApp({
    vendorMobile: opts.vendorMobile,
    vendorName: opts.vendorName,
    orderId: opts.orderId,
    messageType: "status_update",
    content
  });
}

// vendor/server/services/deliveryPincodes.ts
var TABLE = "ev_delivery_pincodes";
var CACHE_TTL_MS = 6e4;
var cache = null;
function supabaseUrl6() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}
function supabaseServiceRoleKey5() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
}
function supabaseHeaders4(extra) {
  const key = supabaseServiceRoleKey5();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra || {}
  };
}
function safeText7(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function toBool2(v, fallback = true) {
  if (v === void 0 || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function normalizePincode(v) {
  const digits = safeText7(v).replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}
function mapRow(x) {
  return {
    id: safeText7(x?.id),
    pincode: normalizePincode(x?.pincode),
    areaName: safeText7(x?.area_name ?? x?.areaName),
    city: safeText7(x?.city),
    district: safeText7(x?.district),
    state: safeText7(x?.state),
    foodEnabled: toBool2(x?.food_enabled ?? x?.foodEnabled, true),
    martEnabled: toBool2(x?.mart_enabled ?? x?.martEnabled, true),
    deliveryFee: toNumber(x?.delivery_fee ?? x?.deliveryFee, 0),
    minOrderValue: toNumber(x?.min_order_value ?? x?.minOrderValue, 0),
    codEnabled: toBool2(x?.cod_enabled ?? x?.codEnabled, true),
    etaMinutes: toNumber(x?.eta_minutes ?? x?.etaMinutes, 45),
    active: toBool2(x?.active, true),
    notes: safeText7(x?.notes)
  };
}
async function loadDeliveryPincodes(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  if (!supabaseUrl6() || !supabaseServiceRoleKey5()) {
    try {
      const { readData: readData2 } = await Promise.resolve().then(() => (init_jsondb(), jsondb_exports));
      const db = await readData2();
      const rows = (Array.isArray(db?.deliveryPincodes) ? db.deliveryPincodes : []).map(mapRow).filter((row) => !!row.pincode);
      if (!rows.length) return null;
      cache = { at: Date.now(), rows };
      return rows;
    } catch {
      return null;
    }
  }
  try {
    const url = `${supabaseUrl6()}/rest/v1/${TABLE}?select=*&order=pincode.asc&limit=2000`;
    const r = await fetch(url, { headers: supabaseHeaders4() });
    if (!r.ok) return null;
    const payload = await r.json().catch(() => []);
    const rows = (Array.isArray(payload) ? payload : []).map(mapRow).filter((row) => !!row.pincode);
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return null;
  }
}
async function listServiceablePincodes(service) {
  const rows = await loadDeliveryPincodes();
  if (!rows) return [];
  return rows.filter((row) => {
    if (!row.active) return false;
    if (service === "food") return row.foodEnabled;
    if (service === "mart") return row.martEnabled;
    return row.foodEnabled || row.martEnabled;
  });
}
async function checkPincodeServiceability(rawPincode, service, opts) {
  const rows = await loadDeliveryPincodes();
  const whitelistConfigured = Array.isArray(rows) && rows.length > 0;
  const pincode = normalizePincode(rawPincode);
  if (!whitelistConfigured) {
    return { serviceable: true, unrestricted: true, reason: "", message: "", entry: null };
  }
  if (!pincode) {
    if (opts?.required === false) {
      return { serviceable: true, unrestricted: false, reason: "", message: "", entry: null };
    }
    return {
      serviceable: false,
      unrestricted: false,
      reason: safeText7(rawPincode) ? "PINCODE_INVALID" : "PINCODE_REQUIRED",
      message: safeText7(rawPincode) ? "Enter a valid 6-digit pincode." : "Delivery pincode is required.",
      entry: null
    };
  }
  const entry = (rows || []).find((row) => row.pincode === pincode) || null;
  if (!entry || !entry.active) {
    return {
      serviceable: false,
      unrestricted: false,
      reason: "PINCODE_NOT_SERVICEABLE",
      message: `We do not deliver to ${pincode} yet.`,
      entry: null
    };
  }
  const enabled = service === "food" ? entry.foodEnabled : entry.martEnabled;
  if (!enabled) {
    return {
      serviceable: false,
      unrestricted: false,
      reason: "SERVICE_DISABLED_FOR_PINCODE",
      message: `${service === "food" ? "Food" : "Mart"} delivery is not available at ${pincode} right now.`,
      entry
    };
  }
  return { serviceable: true, unrestricted: false, reason: "", message: "", entry };
}

// vendor/server/routes/delivery.ts
function safeText8(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function parseService(v) {
  const s = safeText8(v).toLowerCase();
  return s === "food" || s === "mart" ? s : void 0;
}
function deliveryRouter(bot, adminChatIds) {
  const r = (0, import_express3.Router)();
  r.get("/pincodes", async (req, res) => {
    const service = parseService(req.query?.service);
    const rows = await listServiceablePincodes(service);
    return res.json({
      ok: true,
      service: service || "all",
      // No whitelist rows configured means delivery is unrestricted.
      unrestricted: rows.length === 0,
      pincodes: rows
    });
  });
  r.get("/pincodes/:pincode", async (req, res) => {
    const pincode = normalizePincode(req.params.pincode);
    const service = parseService(req.query?.service) || "mart";
    const result = await checkPincodeServiceability(pincode, service);
    return res.json({ ok: true, pincode, service, ...result });
  });
  const UpdateSchema = import_zod3.z.object({
    orderId: import_zod3.z.string().min(1),
    status: import_zod3.z.enum(["pending", "confirmed", "processing", "picked_up", "in_transit", "delivered", "completed", "cancelled"]),
    notes: import_zod3.z.string().optional(),
    assignedTo: import_zod3.z.string().optional(),
    assignedPhone: import_zod3.z.string().optional()
  });
  r.post("/update-status", async (req, res) => {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const { orderId, status: newStatus, notes, assignedTo, assignedPhone } = parsed.data;
    let found = false;
    let orderEmail = "";
    let orderName = "";
    let orderType = "";
    let orderPhone = "";
    let vendorMobile = "";
    let vendorName = "";
    let completedTable = "";
    let completedRow = null;
    try {
      await mutateData((db) => {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        for (const b of db.bookings) {
          if (b.id === orderId) {
            b.status = newStatus;
            found = true;
            orderEmail = b.email || "";
            orderName = b.userName || "";
            orderType = b.type || "booking";
            orderPhone = b.phone || "";
            if (newStatus === "completed") {
              completedTable = "ev_bookings";
              completedRow = { ...b };
            }
            db.auditLog.push({
              id: makeId("audit"),
              at: now,
              action: "UPDATE_DELIVERY_STATUS",
              entity: "booking",
              entityId: orderId
            });
            return;
          }
        }
        for (const f of db.foodOrders) {
          if (f.id === orderId) {
            f.status = newStatus;
            found = true;
            orderName = f.userName || "";
            orderType = "food";
            orderPhone = f.phone || "";
            if (newStatus === "completed") {
              completedTable = "ev_food_orders";
              completedRow = { ...f };
            }
            const restaurantId = f.restaurantId;
            if (restaurantId) {
              const restaurant = (db.restaurants || []).find((r2) => r2.id === restaurantId);
              if (restaurant) {
                vendorMobile = restaurant.vendorMobile || "";
                vendorName = restaurant.name || "";
              }
            }
            db.auditLog.push({
              id: makeId("audit"),
              at: now,
              action: "UPDATE_DELIVERY_STATUS",
              entity: "food",
              entityId: orderId
            });
            return;
          }
        }
        for (const c of db.cabBookings) {
          if (c.id === orderId) {
            c.status = newStatus;
            found = true;
            orderName = c.userName || "";
            orderType = "cab";
            orderPhone = c.phone || "";
            if (newStatus === "completed") {
              completedTable = "ev_cab_bookings";
              completedRow = { ...c };
            }
            db.auditLog.push({
              id: makeId("audit"),
              at: now,
              action: "UPDATE_DELIVERY_STATUS",
              entity: "cab",
              entityId: orderId
            });
            return;
          }
        }
      }, "delivery_update");
    } catch (err) {
      return res.status(500).json({ error: "UPDATE_FAILED", message: String(err?.message || err) });
    }
    if (!found) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    if (newStatus === "completed" && completedTable && completedRow) {
      await ensureInvoiceForCompletedTransaction({
        table: completedTable,
        row: completedRow,
        source: "delivery_status_update"
      }).catch(() => {
      });
    }
    if (orderEmail) {
      const statusMessages = {
        confirmed: "Your order has been confirmed.",
        processing: "Your order is being processed.",
        picked_up: "Your order has been picked up!",
        in_transit: "Your order is on its way!",
        delivered: "Your order has been delivered. Enjoy!",
        completed: "Your order is completed. Thank you!",
        cancelled: "Your order has been cancelled."
      };
      sendOrderStatusEmail({
        email: orderEmail,
        name: orderName,
        orderId,
        orderType,
        status: newStatus,
        message: statusMessages[newStatus] || `Status: ${newStatus}`
      }).catch((err) => console.error("[DELIVERY:EMAIL]", err));
    }
    if (vendorMobile) {
      notifyVendorStatusUpdate({
        vendorMobile,
        vendorName,
        orderId,
        status: newStatus,
        notes
      }).catch((err) => console.error("[DELIVERY:VENDOR]", err));
    }
    const telegramMsg = `\u{1F4CB} Order ${orderId} \u2192 ${newStatus.toUpperCase().replace(/_/g, " ")}
Type: ${orderType}
Customer: ${orderName}${notes ? `
Notes: ${notes}` : ""}`;
    for (const chatId of adminChatIds) {
      bot.sendMessage(chatId, telegramMsg).catch(() => {
      });
    }
    return res.json({ ok: true, orderId, status: newStatus });
  });
  r.get("/track/:orderId", requireAuth, async (req, res) => {
    const orderId = safeText8(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "ORDER_ID_REQUIRED" });
    const claims = getAuthClaims(req);
    const db = await readData();
    const order = [...db.bookings, ...db.foodOrders, ...db.cabBookings].find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    const userPhone = String(claims?.phone || "").trim();
    const userEmail = String(claims?.email || "").trim().toLowerCase();
    const orderPhone = String(order.phone || "").trim();
    const orderEmailRaw = String(order.email || "").trim().toLowerCase();
    if (userPhone && orderPhone && userPhone !== orderPhone) {
      if (!userEmail || !orderEmailRaw || userEmail !== orderEmailRaw) {
        return res.status(403).json({ error: "NOT_YOUR_ORDER" });
      }
    }
    return res.json({
      ok: true,
      order: {
        id: order.id,
        type: order.type || "unknown",
        status: order.status,
        userName: order.userName,
        pricing: order.pricing,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        checkIn: order.checkIn,
        checkOut: order.checkOut,
        tourDate: order.tourDate,
        date: order.bookingDate || order.orderTime || order.createdAt
      }
    });
  });
  return r;
}

// vendor/server/routes/driver.ts
var import_express4 = require("express");
var import_jsonwebtoken4 = __toESM(require("jsonwebtoken"));
var import_multer3 = __toESM(require("multer"));
var import_zod4 = require("zod");
var import_crypto3 = __toESM(require("crypto"));
var import_fs3 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));
init_src();
init_jsondb();

// vendor/server/services/realtime.ts
var import_events = require("events");
var emitter = new import_events.EventEmitter();
emitter.setMaxListeners(1e3);
function channelKey(channel) {
  return String(channel || "").trim().toLowerCase();
}
function publishRealtime(channel, event) {
  const key = channelKey(channel);
  if (!key) return;
  emitter.emit(key, event);
}
function subscribeRealtime(channel, onEvent) {
  const key = channelKey(channel);
  if (!key) return () => void 0;
  emitter.on(key, onEvent);
  return () => emitter.off(key, onEvent);
}

// vendor/server/routes/driver.ts
var upload3 = (0, import_multer3.default)({
  storage: import_multer3.default.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
var SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
var SUPABASE_BUCKET = process.env.SUPABASE_DRIVER_DOCS_BUCKET || "driver-docs";
function safeText9(v) {
  return v === void 0 || v === null ? "" : String(v).trim();
}
function normalizePhone3(v) {
  const n = safeText9(v).replace(/\s+/g, "");
  if (!n) return "";
  return n.startsWith("+") ? n : `+${n}`;
}
function normalizeUsername2(v) {
  return safeText9(v).toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}
function normalizeRideOtpStatus(ride) {
  const explicit = safeText9(ride?.rideOtpStatus || "").toLowerCase();
  if (["not_required", "pending", "verified"].includes(explicit)) return explicit;
  if (safeText9(ride?.rideOtpVerifiedAt || "")) return "verified";
  if (safeText9(ride?.rideOtp || "")) return "pending";
  return "not_required";
}
function deriveRidePaymentStatus(ride, assignment, bid) {
  const explicit = safeText9(ride?.paymentStatus || ride?.payment_status || "").toLowerCase();
  if (explicit) return explicit;
  const rideStatus = safeText9(ride?.status || ride?.rideStatus || "").toLowerCase();
  const assignmentStatus = safeText9(assignment?.status || "").toLowerCase();
  const bidStatus = safeText9(bid?.status || "").toLowerCase();
  if (["confirmed", "started", "completed"].includes(rideStatus)) return "paid";
  if (["assigned", "accepted", "started", "completed"].includes(assignmentStatus)) return "paid";
  if (bidStatus === "accepted") return "paid";
  if (safeText9(ride?.selectedBidId || ride?.selected_bid_id || assignment?.bidId || assignment?.bid_id || "")) {
    return "pending";
  }
  return "";
}
function deriveRideOtpRequired(ride, assignment) {
  if (safeText9(ride?.rideOtp || "")) return true;
  const rideStatus = safeText9(ride?.status || ride?.rideStatus || "").toLowerCase();
  const assignmentStatus = safeText9(assignment?.status || "").toLowerCase();
  return ["confirmed", "started"].includes(rideStatus) && ["assigned", "accepted", "started"].includes(assignmentStatus);
}
var GOOGLE_MAPS_JS_KEY_ENV_KEYS = [
  "EXPO_PUBLIC_GOOGLE_MAPS_JS_API_KEY",
  "GOOGLE_MAPS_JS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_KEY",
  "EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_API_KEY",
  "EXPO_PUBLIC_GOOGLE_ROADS_API_KEY"
];
function parseDotEnvForKey(filePath) {
  let content = "";
  try {
    content = import_fs3.default.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
  const lines = content.split(/\r?\n/);
  const targetKeys = new Set(GOOGLE_MAPS_JS_KEY_ENV_KEYS);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = safeText9(match[1]);
    if (!targetKeys.has(key)) continue;
    const raw = safeText9(match[2] || "");
    const unwrapped = raw.replace(/^(['"])(.*)\1$/, "$2");
    const value = safeText9(unwrapped);
    if (value) return value;
  }
  return "";
}
function readGoogleMapsJsApiKey() {
  for (const envKey of GOOGLE_MAPS_JS_KEY_ENV_KEYS) {
    const value = safeText9(process.env?.[envKey]);
    if (value) return value;
  }
  const roots = [
    process.cwd(),
    import_path6.default.resolve(process.cwd(), ".."),
    import_path6.default.resolve(process.cwd(), "../..")
  ];
  const candidates = /* @__PURE__ */ new Set();
  for (const root of roots) {
    candidates.add(import_path6.default.resolve(root, ".env"));
    candidates.add(import_path6.default.resolve(root, "server/.env"));
    candidates.add(import_path6.default.resolve(root, "apps/app/.env"));
  }
  for (const filePath of candidates) {
    const value = parseDotEnvForKey(filePath);
    if (value) return value;
  }
  return "";
}
function signDriverToken(payload) {
  return import_jsonwebtoken4.default.sign({ sub: payload.driverId, phone: payload.phone, name: payload.name, username: safeText9(payload.username), role: "driver", mode: "driver" }, getJwtSecret(), {
    expiresIn: "7d"
  });
}
function hashPassword(password) {
  const salt = import_crypto3.default.randomBytes(16).toString("hex");
  const hash = import_crypto3.default.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword2(password, storedHash) {
  const text = safeText9(storedHash);
  if (!text) return false;
  if (!text.startsWith("scrypt$")) return text === password;
  const parts = text.split("$");
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expected = parts[2];
  const candidate = import_crypto3.default.scryptSync(password, salt, 64).toString("hex");
  if (expected.length !== candidate.length) return false;
  return import_crypto3.default.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(candidate, "hex"));
}
function driverRouteErrorStatus(message) {
  const code = safeText9(message).toUpperCase();
  if (!code) return 500;
  if ([
    "INVALID_INPUT",
    "RIDE_ID_REQUIRED",
    "OTP_REQUIRED",
    "RIDE_OTP_NOT_READY",
    "INVALID_RIDE_OTP",
    "OTP_VERIFICATION_REQUIRED",
    "USERNAME_REQUIRED",
    "PASSWORD_REQUIRED"
  ].includes(code)) return 400;
  if ([
    "AUTH_REQUIRED",
    "INVALID_TOKEN"
  ].includes(code)) return 401;
  if ([
    "DRIVER_AUTH_REQUIRED",
    "DRIVER_NOT_APPROVED"
  ].includes(code)) return 403;
  if ([
    "DRIVER_NOT_FOUND",
    "RIDE_NOT_FOUND",
    "ASSIGNMENT_NOT_FOUND",
    "BID_NOT_FOUND"
  ].includes(code)) return 404;
  if ([
    "TRIP_ALREADY_CLOSED",
    "RIDE_NOT_OPEN"
  ].includes(code)) return 409;
  return 500;
}
function detectImageType(buffer) {
  if (buffer.length >= 8) {
    const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
    if (pngSig.every((b, i) => buffer[i] === b)) return { ext: "png", contentType: "image/png" };
  }
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF") {
    return { ext: "pdf", contentType: "application/pdf" };
  }
  return null;
}
function encodePath3(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}
async function uploadDriverDocumentToSupabase(buffer, contentType, ext) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const safeExt = (ext || "jpg").replace(/[^a-z0-9]/gi, "");
  const objectPath = `driver-docs/${Date.now()}_${makeId("driverdoc")}.${safeExt}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodePath3(SUPABASE_BUCKET)}/${encodePath3(objectPath)}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType
    },
    body: buffer
  });
  if (!response.ok) throw new Error(`SUPABASE_UPLOAD_FAILED:${response.status}:${await response.text()}`);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodePath3(SUPABASE_BUCKET)}/${encodePath3(objectPath)}`;
  return { publicUrl, objectPath };
}
async function requireDriverAuth(req, res, next) {
  await requireAuth(req, res, () => void 0);
  if (res.headersSent) return;
  const claims = getAuthClaims(req);
  if (!claims?.sub) return res.status(401).json({ error: "AUTH_REQUIRED" });
  if (safeText9(claims?.role).toLowerCase() !== "driver" && safeText9(claims?.mode).toLowerCase() !== "driver") {
    return res.status(403).json({ error: "DRIVER_AUTH_REQUIRED" });
  }
  return next();
}
var DriverRegistrationSchema = import_zod4.z.object({
  name: import_zod4.z.string().min(2),
  phone: import_zod4.z.string().min(8),
  email: import_zod4.z.string().email().or(import_zod4.z.string().length(0)).default(""),
  vehicleType: import_zod4.z.string().min(1),
  carName: import_zod4.z.string().default(""),
  vehicleNumber: import_zod4.z.string().min(1),
  licenseNumber: import_zod4.z.string().min(1),
  idProofUrl: import_zod4.z.string().default(""),
  notes: import_zod4.z.string().default(""),
  documents: import_zod4.z.array(import_zod4.z.object({
    kind: import_zod4.z.string().default("other"),
    url: import_zod4.z.string().min(1),
    label: import_zod4.z.string().default("")
  })).default([])
});
var DriverLoginSchema = import_zod4.z.object({
  username: import_zod4.z.string().min(3),
  password: import_zod4.z.string().min(4)
});
var DriverAvailabilitySchema2 = import_zod4.z.object({
  online: import_zod4.z.boolean(),
  lat: import_zod4.z.number().optional(),
  lng: import_zod4.z.number().optional()
});
var DriverVehicleUpdateSchema = import_zod4.z.object({
  carName: import_zod4.z.string().min(1).max(80).optional(),
  vehicleType: import_zod4.z.enum(["ordinary", "luxury", "suv", "traveller"]).optional()
});
var DriverProfileUpdateSchema = import_zod4.z.object({
  name: import_zod4.z.string().min(2).max(80).optional(),
  phone: import_zod4.z.string().min(8).optional()
});
var DriverPhoneChangeRequestSchema = import_zod4.z.object({
  phone: import_zod4.z.string().min(8)
});
var DriverBidSchema2 = import_zod4.z.object({
  rideRequestId: import_zod4.z.string().min(1),
  bidPrice: import_zod4.z.number().positive(),
  etaMin: import_zod4.z.number().int().positive()
});
var ADMIN_CHAT_IDS = String(process.env.ADMIN_CHAT_IDS || "").split(",").map((v) => Number(String(v || "").trim())).filter((v) => Number.isFinite(v) && v > 0);
var TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
async function notifyDriverPhoneChangeRequestToAdmins(payload) {
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_IDS.length) return;
  const msg = `DRIVER PHONE CHANGE REQUEST

Request ID: ${payload.requestId}
Driver: ${payload.driverName || "Driver"}
Driver ID: ${payload.driverId}
Username: ${payload.username || "\u2014"}
Current Phone: ${payload.currentPhone || "\u2014"}
Requested Phone: ${payload.requestedPhone || "\u2014"}

Review this in the admin dashboard.`;
  await Promise.allSettled(
    ADMIN_CHAT_IDS.map(async (chatId) => {
      const endpoint = `https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_BOT_TOKEN)}/sendMessage`;
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg })
      });
    })
  );
}
function driverRouter() {
  const r = (0, import_express4.Router)();
  const forwardRejections = (handler) => {
    if (typeof handler !== "function" || handler.length >= 4) return handler;
    return function wrapped(req, res, next) {
      try {
        const result = handler(req, res, next);
        if (result && typeof result.then === "function") result.catch(next);
        return result;
      } catch (err) {
        return next(err);
      }
    };
  };
  ["get", "post", "put", "patch", "delete"].forEach((method) => {
    const original = r[method].bind(r);
    r[method] = (path8, ...handlers) => original(path8, ...handlers.map(forwardRejections));
  });
  const fetchDriverProfile = async (driverId) => {
    const db = await readData();
    const anyDb = db;
    const driver = (Array.isArray(anyDb.drivers) ? anyDb.drivers : []).find((x) => safeText9(x?.id) === driverId);
    if (!driver) return null;
    const vehicle = (Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : []).find((x) => safeText9(x?.driverId) === driverId);
    const availability = (Array.isArray(anyDb.driverAvailability) ? anyDb.driverAvailability : []).find((x) => safeText9(x?.driverId) === driverId);
    return {
      id: driver.id,
      name: driver.name,
      username: safeText9(driver.username),
      phone: normalizePhone3(driver.phone),
      email: safeText9(driver.email),
      rating: Number(driver.rating || 4.5),
      vehicleType: safeText9(vehicle?.viechle_cat || vehicle?.vehicleType),
      carName: safeText9(vehicle?.model || vehicle?.carName || ""),
      vehicleNumber: safeText9(vehicle?.vehicleNumber),
      online: !!availability?.online
    };
  };
  const assertDriverExists = async (driverId) => {
    const profile = await fetchDriverProfile(driverId);
    if (!profile) throw new Error("DRIVER_NOT_FOUND");
    return profile;
  };
  r.post("/upload-document", upload3.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file?.buffer) return res.status(400).json({ error: "FILE_REQUIRED" });
      const detected = detectImageType(file.buffer);
      if (!detected) return res.status(400).json({ error: "INVALID_FILE_TYPE", message: "Allowed: JPG, PNG, PDF." });
      const uploaded = await uploadDriverDocumentToSupabase(file.buffer, detected.contentType, detected.ext);
      return res.json({ ok: true, url: uploaded.publicUrl, path: uploaded.objectPath });
    } catch (err) {
      return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
    }
  });
  r.post("/register", async (req, res) => {
    const parsed = DriverRegistrationSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const phone = normalizePhone3(body.phone);
    const email = safeText9(body.email).toLowerCase();
    let requestId = "";
    let driverId = "";
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      if (!Array.isArray(anyDb.driverDocuments)) anyDb.driverDocuments = [];
      const duplicateReq = anyDb.driverRegistrationRequests.find(
        (x) => normalizePhone3(x?.phone) === phone && ["pending", "approved"].includes(safeText9(x?.status).toLowerCase())
      );
      if (duplicateReq) throw new Error("REGISTRATION_ALREADY_EXISTS");
      requestId = makeId("driver_req");
      driverId = makeId("drv");
      anyDb.driverRegistrationRequests.unshift({
        id: requestId,
        name: body.name,
        phone,
        email,
        vehicleType: body.vehicleType,
        carName: body.carName || "",
        vehicleNumber: body.vehicleNumber,
        licenseNumber: body.licenseNumber,
        idProofUrl: body.idProofUrl || "",
        notes: body.notes || "",
        status: "pending",
        reviewedBy: "",
        reviewedAt: "",
        rejectionReason: "",
        createdAt: now
      });
      anyDb.drivers.unshift({
        id: driverId,
        registrationRequestId: requestId,
        name: body.name,
        username: "",
        phone,
        email,
        passwordHash: "",
        status: "pending",
        rating: 4.5,
        active: true,
        createdAt: now,
        updatedAt: now
      });
      anyDb.driverVehicles.unshift({
        id: makeId("veh"),
        driverId,
        vehicleType: body.vehicleType,
        viechle_cat: body.vehicleType,
        vehicleNumber: body.vehicleNumber,
        color: "",
        model: body.carName || "",
        seats: body.vehicleType.toLowerCase().includes("suv") ? 6 : 4,
        createdAt: now
      });
      const docs = [];
      if (body.idProofUrl) docs.push({ kind: "id_proof", url: body.idProofUrl, label: "ID Proof" });
      docs.push({ kind: "license", url: body.licenseNumber, label: "License Number" });
      (body.documents || []).forEach((doc) => docs.push(doc));
      docs.forEach((doc) => {
        anyDb.driverDocuments.unshift({
          id: makeId("doc"),
          driverId,
          registrationRequestId: requestId,
          kind: safeText9(doc.kind || "other") || "other",
          url: safeText9(doc.url),
          label: safeText9(doc.label),
          createdAt: now
        });
      });
      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_REGISTRATION_REQUEST_CREATED",
        entity: "driver_registration_request",
        entityId: requestId,
        meta: { phone, name: body.name, vehicleType: body.vehicleType }
      });
    }, "driver_registration");
    publishRealtime("admin:driver_requests", {
      type: "driver_registration_created",
      at: now,
      payload: { requestId, driverId, phone }
    });
    return res.json({ ok: true, requestId, driverId, status: "pending" });
  });
  r.post("/registrations/:id/review", requireAuth, async (req, res) => {
    const registrationId = safeText9(req.params.id);
    const body = import_zod4.z.object({
      action: import_zod4.z.enum(["approve", "reject"]),
      reason: import_zod4.z.string().default(""),
      username: import_zod4.z.string().min(3).optional(),
      password: import_zod4.z.string().min(4).optional()
    }).safeParse(req.body ?? {});
    if (!registrationId || !body.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let out = null;
    await mutateData((db) => {
      const anyDb = db;
      const reqRows = Array.isArray(anyDb.driverRegistrationRequests) ? anyDb.driverRegistrationRequests : [];
      const driverRows = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
      const reqRow = reqRows.find((x) => safeText9(x?.id) === registrationId);
      if (!reqRow) throw new Error("REQUEST_NOT_FOUND");
      const driverRow = driverRows.find((x) => safeText9(x?.registrationRequestId) === registrationId || normalizePhone3(x?.phone) === normalizePhone3(reqRow.phone));
      if (!driverRow) throw new Error("DRIVER_NOT_FOUND");
      if (body.data.action === "approve") {
        const username = normalizeUsername2(body.data.username);
        if (!username) throw new Error("USERNAME_REQUIRED");
        if (!safeText9(body.data.password)) throw new Error("PASSWORD_REQUIRED");
        const duplicateUsername = driverRows.find(
          (x) => safeText9(x?.id) !== safeText9(driverRow?.id) && normalizeUsername2(x?.username) === username
        );
        if (duplicateUsername) throw new Error("USERNAME_ALREADY_IN_USE");
        reqRow.status = "approved";
        reqRow.reviewedBy = safeText9(claims?.email || claims?.phone || claims?.sub || "admin");
        reqRow.reviewedAt = now;
        reqRow.rejectionReason = "";
        driverRow.status = "approved";
        driverRow.active = true;
        driverRow.username = username;
        driverRow.passwordHash = hashPassword(safeText9(body.data.password));
        driverRow.updatedAt = now;
      } else {
        reqRow.status = "rejected";
        reqRow.reviewedBy = safeText9(claims?.email || claims?.phone || claims?.sub || "admin");
        reqRow.reviewedAt = now;
        reqRow.rejectionReason = safeText9(body.data.reason);
        driverRow.status = "rejected";
        driverRow.active = false;
        driverRow.updatedAt = now;
      }
      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: body.data.action === "approve" ? "DRIVER_APPROVED" : "DRIVER_REJECTED",
        entity: "driver_registration_request",
        entityId: registrationId,
        meta: {
          driverId: driverRow.id,
          username: safeText9(driverRow.username),
          reviewedBy: reqRow.reviewedBy,
          reason: reqRow.rejectionReason
        }
      });
      out = { requestId: reqRow.id, driverId: driverRow.id, status: reqRow.status };
    }, "driver_review");
    publishRealtime("admin:driver_requests", {
      type: "driver_registration_reviewed",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });
  r.post("/admin/create", requireAuth, async (req, res) => {
    const parsed = import_zod4.z.object({
      name: import_zod4.z.string().min(2),
      username: import_zod4.z.string().min(3),
      password: import_zod4.z.string().min(4),
      phone: import_zod4.z.string().min(8),
      email: import_zod4.z.string().email().or(import_zod4.z.string().length(0)).default(""),
      vehicleType: import_zod4.z.string().min(1).default("ordinary"),
      carName: import_zod4.z.string().default(""),
      vehicleNumber: import_zod4.z.string().min(1),
      licenseNumber: import_zod4.z.string().min(1),
      notes: import_zod4.z.string().default("")
    }).safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const body = parsed.data;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const username = normalizeUsername2(body.username);
    const phone = normalizePhone3(body.phone);
    const email = safeText9(body.email).toLowerCase();
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
    let out = null;
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      if (!Array.isArray(anyDb.driverDocuments)) anyDb.driverDocuments = [];
      const drivers = anyDb.drivers;
      const duplicateUsername = drivers.find((x) => normalizeUsername2(x?.username) === username);
      if (duplicateUsername) throw new Error("USERNAME_ALREADY_IN_USE");
      const duplicatePhone = drivers.find((x) => normalizePhone3(x?.phone) === phone);
      if (duplicatePhone) throw new Error("PHONE_ALREADY_IN_USE");
      const requestId = makeId("driver_req");
      const driverId = makeId("drv");
      const reviewer = safeText9(getAuthClaims(req)?.email || getAuthClaims(req)?.phone || getAuthClaims(req)?.sub || "admin");
      anyDb.driverRegistrationRequests.unshift({
        id: requestId,
        name: body.name,
        phone,
        email,
        vehicleType: body.vehicleType,
        carName: body.carName || "",
        vehicleNumber: body.vehicleNumber,
        licenseNumber: body.licenseNumber,
        idProofUrl: "",
        notes: body.notes || "",
        status: "approved",
        reviewedBy: reviewer,
        reviewedAt: now,
        rejectionReason: "",
        createdAt: now,
        updatedAt: now
      });
      anyDb.drivers.unshift({
        id: driverId,
        registrationRequestId: requestId,
        name: body.name,
        username,
        phone,
        email,
        passwordHash: hashPassword(body.password),
        status: "approved",
        rating: 4.5,
        active: true,
        createdAt: now,
        updatedAt: now
      });
      anyDb.driverVehicles.unshift({
        id: makeId("veh"),
        driverId,
        vehicleType: body.vehicleType,
        viechle_cat: body.vehicleType,
        vehicleNumber: body.vehicleNumber,
        color: "",
        model: body.carName || "",
        seats: safeText9(body.vehicleType).toLowerCase().includes("suv") ? 6 : 4,
        createdAt: now,
        updatedAt: now
      });
      anyDb.driverDocuments.unshift({
        id: makeId("doc"),
        driverId,
        registrationRequestId: requestId,
        kind: "license",
        url: safeText9(body.licenseNumber),
        label: "License Number",
        createdAt: now
      });
      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_CREATED_BY_ADMIN",
        entity: "driver",
        entityId: driverId,
        meta: { requestId, username, phone, reviewedBy: reviewer }
      });
      out = { driverId, requestId, username, status: "approved" };
    }, "driver_admin_create");
    publishRealtime("admin:driver_requests", {
      type: "driver_created_by_admin",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });
  r.post("/login", async (req, res) => {
    const parsed = DriverLoginSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const username = normalizeUsername2(parsed.data.username);
    const password = safeText9(parsed.data.password);
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
    const db = await readData();
    const anyDb = db;
    const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
    const driver = drivers.find((x) => normalizeUsername2(x?.username) === username);
    if (!driver) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    if (safeText9(driver.status).toLowerCase() !== "approved" || driver.active === false) {
      return res.status(403).json({ error: "DRIVER_NOT_APPROVED" });
    }
    if (!verifyPassword2(password, safeText9(driver.passwordHash))) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    const token = signDriverToken({
      driverId: safeText9(driver.id),
      phone: normalizePhone3(driver.phone),
      name: safeText9(driver.name),
      username: safeText9(driver.username)
    });
    return res.json({
      ok: true,
      token,
      driver: {
        id: safeText9(driver.id),
        name: safeText9(driver.name),
        username: safeText9(driver.username),
        phone: normalizePhone3(driver.phone),
        email: safeText9(driver.email),
        rating: Number(driver.rating || 4.5)
      }
    });
  });
  r.get("/me", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const profile = await fetchDriverProfile(driverId);
    if (!profile) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({
      ok: true,
      driver: profile,
      googleMapsJsApiKey
    });
  });
  r.get("/me/profile", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const profile = await fetchDriverProfile(driverId);
    if (!profile) return res.status(404).json({ error: "DRIVER_NOT_FOUND" });
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({ ok: true, driver: profile, googleMapsJsApiKey });
  });
  r.get("/maps-config", requireDriverAuth, async (_req, res) => {
    const googleMapsJsApiKey = readGoogleMapsJsApiKey();
    return res.json({ ok: true, googleMapsJsApiKey });
  });
  r.post("/me/vehicle", requireDriverAuth, async (req, res) => {
    const parsed = DriverVehicleUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const carName = safeText9(parsed.data.carName);
    const vehicleTypeInput = safeText9(parsed.data.vehicleType).toLowerCase();
    if (!carName && !vehicleTypeInput) return res.status(400).json({ error: "VEHICLE_FIELDS_REQUIRED" });
    const vehicleType = vehicleTypeInput === "luxury" ? "Luxury" : vehicleTypeInput === "suv" ? "SUV" : vehicleTypeInput === "traveller" ? "Traveller" : "Ordinary";
    const seats = vehicleTypeInput === "traveller" ? 12 : vehicleTypeInput === "suv" ? 6 : 4;
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      const vehicles = anyDb.driverVehicles;
      const existing = vehicles.find((x) => safeText9(x?.driverId) === driverId);
      if (existing) {
        if (carName) {
          existing.model = carName;
          existing.carName = carName;
        }
        if (vehicleTypeInput) {
          existing.vehicleType = vehicleType;
          existing.viechle_cat = vehicleType;
          existing.seats = seats;
        }
        existing.updatedAt = now;
      } else {
        vehicles.unshift({
          id: makeId("veh"),
          driverId,
          vehicleType: vehicleTypeInput ? vehicleType : "",
          viechle_cat: vehicleTypeInput ? vehicleType : "",
          vehicleNumber: "",
          model: carName,
          carName,
          seats: vehicleTypeInput ? seats : 4,
          createdAt: now,
          updatedAt: now
        });
      }
    }, "driver_vehicle_update");
    return res.json({ ok: true, carName, vehicleType: vehicleTypeInput ? vehicleType : "", seats: vehicleTypeInput ? seats : 4 });
  });
  r.post("/me/profile", requireDriverAuth, async (req, res) => {
    const parsed = DriverProfileUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const nextNameInput = safeText9(parsed.data.name);
    const nextPhoneInput = safeText9(parsed.data.phone);
    if (nextPhoneInput) return res.status(400).json({ error: "PHONE_CHANGE_REQUEST_REQUIRED" });
    if (!nextNameInput && !nextPhoneInput) return res.status(400).json({ error: "PROFILE_FIELDS_REQUIRED" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let updated = null;
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      const drivers = anyDb.drivers;
      const driver = drivers.find((x) => safeText9(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");
      const nextPhone = nextPhoneInput ? normalizePhone3(nextPhoneInput) : normalizePhone3(driver.phone);
      const nextName = nextNameInput || safeText9(driver.name);
      if (!nextName) throw new Error("NAME_REQUIRED");
      if (!nextPhone) throw new Error("PHONE_REQUIRED");
      const duplicate = drivers.find(
        (x) => safeText9(x?.id) !== driverId && normalizePhone3(x?.phone) === nextPhone
      );
      if (duplicate) throw new Error("PHONE_ALREADY_IN_USE");
      driver.name = nextName;
      driver.phone = nextPhone;
      driver.updatedAt = now;
      if (Array.isArray(anyDb.driverRegistrationRequests)) {
        const reqRow = anyDb.driverRegistrationRequests.find(
          (x) => safeText9(x?.id) === safeText9(driver?.registrationRequestId || "")
        );
        if (reqRow) {
          reqRow.name = nextName;
          reqRow.phone = nextPhone;
          reqRow.updatedAt = now;
        }
      }
      updated = {
        id: safeText9(driver.id),
        name: nextName,
        username: safeText9(driver.username),
        phone: nextPhone,
        email: safeText9(driver.email),
        rating: Number(driver.rating || 4.5)
      };
    }, "driver_profile_update");
    const refreshedToken = signDriverToken({
      driverId: safeText9(updated.id),
      phone: normalizePhone3(updated.phone),
      name: safeText9(updated.name),
      username: safeText9(updated.username)
    });
    return res.json({ ok: true, driver: updated, token: refreshedToken });
  });
  r.post("/me/request-phone-change", requireDriverAuth, async (req, res) => {
    const parsed = DriverPhoneChangeRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const requestedPhone = normalizePhone3(parsed.data.phone);
    if (!requestedPhone) return res.status(400).json({ error: "PHONE_REQUIRED" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let out = null;
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.driverRegistrationRequests)) anyDb.driverRegistrationRequests = [];
      if (!Array.isArray(anyDb.drivers)) anyDb.drivers = [];
      if (!Array.isArray(anyDb.driverVehicles)) anyDb.driverVehicles = [];
      const drivers = anyDb.drivers;
      const requests = anyDb.driverRegistrationRequests;
      const vehicles = anyDb.driverVehicles;
      const driver = drivers.find((x) => safeText9(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");
      const currentPhone = normalizePhone3(driver.phone);
      if (requestedPhone === currentPhone) throw new Error("PHONE_UNCHANGED");
      const duplicateDriver = drivers.find(
        (x) => safeText9(x?.id) !== driverId && normalizePhone3(x?.phone) === requestedPhone
      );
      if (duplicateDriver) throw new Error("PHONE_ALREADY_IN_USE");
      const duplicatePending = requests.find(
        (x) => safeText9(x?.vehicleType).toLowerCase() === "phone_change_request" && safeText9(x?.status).toLowerCase() === "pending" && safeText9(x?.notes).includes(`driverId:${driverId}`)
      );
      if (duplicatePending) throw new Error("PHONE_CHANGE_REQUEST_ALREADY_PENDING");
      const vehicle = vehicles.find((x) => safeText9(x?.driverId) === driverId) || {};
      const requestId = makeId("driver_req");
      const driverName = safeText9(driver?.name || "Driver");
      const username = safeText9(driver?.username || "");
      requests.unshift({
        id: requestId,
        name: driverName,
        phone: requestedPhone,
        email: safeText9(driver?.email || ""),
        vehicleType: "phone_change_request",
        vehicleNumber: safeText9(vehicle?.vehicleNumber || currentPhone || "phone-change"),
        licenseNumber: "phone_change_request",
        idProofUrl: "",
        notes: `driverId:${driverId}
username:${username}
currentPhone:${currentPhone}
requestedPhone:${requestedPhone}
requestType:phone_change`,
        status: "pending",
        reviewedBy: "",
        reviewedAt: "",
        rejectionReason: "",
        createdAt: now
      });
      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_PHONE_CHANGE_REQUEST_CREATED",
        entity: "driver_registration_request",
        entityId: requestId,
        meta: { driverId, currentPhone, requestedPhone, username }
      });
      out = { requestId, driverId, driverName, username, currentPhone, requestedPhone, status: "pending" };
    }, "driver_phone_change_request");
    publishRealtime("admin:driver_requests", {
      type: "driver_phone_change_requested",
      at: now,
      payload: out
    });
    await notifyDriverPhoneChangeRequestToAdmins(out).catch(() => {
    });
    return res.json({ ok: true, ...out });
  });
  r.post("/availability", requireDriverAuth, async (req, res) => {
    const parsed = DriverAvailabilitySchema2.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await mutateData((db) => {
      const anyDb = db;
      if (!Array.isArray(anyDb.driverAvailability)) anyDb.driverAvailability = [];
      const rows = anyDb.driverAvailability;
      const row = rows.find((x) => safeText9(x?.driverId) === driverId);
      const next = {
        id: row?.id || makeId("drv_av"),
        driverId,
        online: parsed.data.online,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        updatedAt: now
      };
      if (row) Object.assign(row, next);
      else rows.unshift(next);
    }, "driver_availability");
    publishRealtime("drivers:rides", {
      type: "driver_availability_updated",
      at: now,
      payload: { driverId, online: parsed.data.online }
    });
    return res.json({ ok: true });
  });
  r.get("/rides", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db;
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const activeAssignmentStates = /* @__PURE__ */ new Set(["assigned", "accepted", "started"]);
    const closedAssignmentStates = /* @__PURE__ */ new Set(["completed", "cancelled"]);
    const list = rides.filter((x) => {
      const rideId = safeText9(x?.id);
      const ownBid = bids.filter((b) => safeText9(b?.rideRequestId) === rideId && safeText9(b?.driverId) === driverId).sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
      const ownBidStatus = safeText9(ownBid?.status).toLowerCase();
      const myAssignment = assignments.find(
        (a) => safeText9(a?.rideRequestId) === rideId && safeText9(a?.driverId) === driverId && activeAssignmentStates.has(safeText9(a?.status).toLowerCase())
      );
      const assignedDriverMatch = safeText9(x?.assignedDriverId || x?.assigned_driver_id || "") === driverId;
      const implicitConfirmedForMe = (assignedDriverMatch || ownBidStatus === "accepted") && !["cancelled", "completed", "rejected", "declined"].includes(safeText9(x?.status).toLowerCase());
      if (myAssignment) return true;
      if (implicitConfirmedForMe) return true;
      const rideStatus = safeText9(x?.status).toLowerCase();
      if (!["pending", "searching", "open"].includes(rideStatus)) return false;
      const takenByOther = assignments.some(
        (a) => safeText9(a?.rideRequestId) === rideId && safeText9(a?.driverId) !== driverId && (activeAssignmentStates.has(safeText9(a?.status).toLowerCase()) || safeText9(a?.status).toLowerCase() === "completed")
      );
      if (takenByOther) return false;
      if (["rejected", "declined", "cancelled", "completed"].includes(ownBidStatus)) return false;
      return true;
    }).sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()).map((ride) => {
      const rideId = safeText9(ride.id);
      const ownBid = bids.filter((b) => safeText9(b?.rideRequestId) === rideId && safeText9(b?.driverId) === driverId).sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
      const rideStatus = safeText9(ride?.status || "").toLowerCase();
      const myAssignment = assignments.find(
        (a) => safeText9(a?.rideRequestId) === rideId && safeText9(a?.driverId) === driverId && (activeAssignmentStates.has(safeText9(a?.status).toLowerCase()) || closedAssignmentStates.has(safeText9(a?.status).toLowerCase()))
      );
      const syntheticAssignment = !myAssignment && (safeText9(ride?.assignedDriverId || ride?.assigned_driver_id || "") === driverId || safeText9(ownBid?.status).toLowerCase() === "accepted") ? {
        id: "",
        rideRequestId: rideId,
        driverId,
        bidId: safeText9(ride?.selectedBidId || ride?.selected_bid_id || ownBid?.id || ""),
        status: rideStatus === "started" ? "started" : rideStatus === "completed" ? "completed" : rideStatus === "cancelled" ? "cancelled" : "assigned"
      } : null;
      const effectiveAssignment = myAssignment || syntheticAssignment;
      return {
        id: rideId,
        customerName: safeText9(ride.userName),
        customerPhone: normalizePhone3(ride.phone),
        pickupLocation: safeText9(ride.pickupLocation),
        pickupUpdatedAt: safeText9(ride?.pickupUpdatedAt || ""),
        dropLocation: safeText9(ride.dropLocation),
        distance: Number(ride?.distanceKm || ride?.pricing?.distanceKm || 0),
        estimatedPrice: Number(ride?.pricing?.totalAmount || ride?.estimatedFare || 0),
        vehicleType: safeText9(ride.vehicleType),
        passengers: Number(ride.passengers || 1),
        datetime: safeText9(ride.datetime),
        createdAt: safeText9(ride.createdAt),
        status: safeText9(ride?.status || ""),
        rideStatus: safeText9(ride?.status || ""),
        paymentStatus: deriveRidePaymentStatus(ride, effectiveAssignment, ownBid),
        assignmentStatus: safeText9(effectiveAssignment?.status || ""),
        assignmentId: safeText9(effectiveAssignment?.id || ""),
        bidId: safeText9(ownBid?.id || ""),
        bidPrice: Number(ownBid?.bidPrice || 0),
        etaMin: Number(ownBid?.etaMin || 0),
        bidStatus: safeText9(ownBid?.status || ""),
        otpRequired: deriveRideOtpRequired(ride, effectiveAssignment),
        otpStatus: normalizeRideOtpStatus(ride),
        otpVerifiedAt: safeText9(ride?.rideOtpVerifiedAt || "")
      };
    });
    return res.json({ ok: true, rides: list });
  });
  r.get("/assigned-rides", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db;
    const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const actual = assignments.filter((a) => safeText9(a?.driverId) === driverId && ["assigned", "accepted", "started", "cancelled", "completed"].includes(safeText9(a?.status).toLowerCase())).sort((a, b) => new Date(b?.updatedAt || b?.assignedAt || 0).getTime() - new Date(a?.updatedAt || a?.assignedAt || 0).getTime()).map((a) => {
      const ride = rides.find((r2) => safeText9(r2?.id) === safeText9(a?.rideRequestId)) || {};
      const assignmentStatus = safeText9(a?.status);
      const assignmentStatusLower = assignmentStatus.toLowerCase();
      const rideStatus = safeText9(ride?.status || "");
      const rideStatusLower = rideStatus.toLowerCase();
      const active = ["assigned", "accepted", "started"].includes(assignmentStatusLower) && !["cancelled", "completed", "rejected", "declined"].includes(rideStatusLower) && !safeText9(ride?.cancelledAt || "") && !safeText9(ride?.completedAt || "");
      return {
        assignmentId: safeText9(a?.id),
        rideRequestId: safeText9(a?.rideRequestId),
        status: assignmentStatus,
        rideStatus,
        paymentStatus: deriveRidePaymentStatus(ride, a),
        active,
        customerName: safeText9(ride?.userName),
        pickupLocation: safeText9(ride?.pickupLocation),
        pickupUpdatedAt: safeText9(ride?.pickupUpdatedAt || ""),
        dropLocation: safeText9(ride?.dropLocation),
        customerPhone: normalizePhone3(ride?.phone),
        datetime: safeText9(ride?.datetime),
        cancelledAt: safeText9(ride?.cancelledAt || ""),
        completedAt: safeText9(ride?.completedAt || ""),
        fineAmount: Number(ride?.fineAmount || 0),
        fineStatus: safeText9(ride?.fineStatus || "none"),
        otpRequired: deriveRideOtpRequired(ride, a),
        otpStatus: normalizeRideOtpStatus(ride),
        otpVerifiedAt: safeText9(ride?.rideOtpVerifiedAt || "")
      };
    });
    const knownAssignmentRideIds = new Set(actual.map((item) => safeText9(item?.rideRequestId)).filter(Boolean));
    const synthetic = rides.filter((ride) => {
      const rideId = safeText9(ride?.id);
      if (!rideId || knownAssignmentRideIds.has(rideId)) return false;
      const assignedDriverId = safeText9(ride?.assignedDriverId || ride?.assigned_driver_id || "");
      if (assignedDriverId === driverId) return true;
      const ownBid = bids.filter((b) => safeText9(b?.rideRequestId) === rideId && safeText9(b?.driverId) === driverId).sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
      return safeText9(ownBid?.status).toLowerCase() === "accepted";
    }).map((ride) => {
      const rideId = safeText9(ride?.id);
      const ownBid = bids.filter((b) => safeText9(b?.rideRequestId) === rideId && safeText9(b?.driverId) === driverId).sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())[0];
      const rideStatus = safeText9(ride?.status || "");
      const rideStatusLower = rideStatus.toLowerCase();
      const status = rideStatusLower === "started" ? "started" : rideStatusLower === "completed" ? "completed" : rideStatusLower === "cancelled" ? "cancelled" : "assigned";
      const active = ["assigned", "accepted", "started"].includes(status) && !["cancelled", "completed", "rejected", "declined"].includes(rideStatusLower) && !safeText9(ride?.cancelledAt || "") && !safeText9(ride?.completedAt || "");
      return {
        assignmentId: "",
        rideRequestId: rideId,
        status,
        rideStatus,
        paymentStatus: deriveRidePaymentStatus(ride, { status, bidId: safeText9(ownBid?.id || "") }, ownBid),
        active,
        customerName: safeText9(ride?.userName),
        pickupLocation: safeText9(ride?.pickupLocation),
        pickupUpdatedAt: safeText9(ride?.pickupUpdatedAt || ""),
        dropLocation: safeText9(ride?.dropLocation),
        customerPhone: normalizePhone3(ride?.phone),
        datetime: safeText9(ride?.datetime),
        cancelledAt: safeText9(ride?.cancelledAt || ""),
        completedAt: safeText9(ride?.completedAt || ""),
        fineAmount: Number(ride?.fineAmount || 0),
        fineStatus: safeText9(ride?.fineStatus || "none"),
        otpRequired: deriveRideOtpRequired(ride, { status }),
        otpStatus: normalizeRideOtpStatus(ride),
        otpVerifiedAt: safeText9(ride?.rideOtpVerifiedAt || "")
      };
    });
    return res.json({ ok: true, rides: [...actual, ...synthetic].sort((a, b) => new Date(b?.datetime || b?.assignedAt || b?.updatedAt || 0).getTime() - new Date(a?.datetime || a?.assignedAt || a?.updatedAt || 0).getTime()) });
  });
  r.post("/assigned-rides/:rideRequestId/verify-otp", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const rideRequestId = safeText9(req.params.rideRequestId);
    const parsed = import_zod4.z.object({
      otp: import_zod4.z.string().regex(/^\d{4,6}$/)
    }).safeParse(req.body ?? {});
    if (!rideRequestId || !parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let out = null;
    try {
      await mutateData((db) => {
        const anyDb = db;
        const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const assignment = assignments.find(
          (a) => safeText9(a?.rideRequestId) === rideRequestId && safeText9(a?.driverId) === driverId
        );
        if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
        const assignmentStatus = safeText9(assignment?.status).toLowerCase();
        if (["completed", "cancelled"].includes(assignmentStatus)) throw new Error("TRIP_ALREADY_CLOSED");
        const ride = rides.find((r2) => safeText9(r2?.id) === rideRequestId);
        if (!ride) throw new Error("RIDE_NOT_FOUND");
        const expectedOtp = safeText9(ride?.rideOtp || "");
        if (!expectedOtp) throw new Error("RIDE_OTP_NOT_READY");
        if (expectedOtp !== safeText9(parsed.data.otp)) throw new Error("INVALID_RIDE_OTP");
        ride.rideOtpStatus = "verified";
        ride.rideOtpVerifiedAt = now;
        ride.rideOtpVerifiedBy = driverId;
        if (!["completed", "cancelled"].includes(assignmentStatus)) {
          assignment.status = "started";
          assignment.updatedAt = now;
          assignment.startedAt = safeText9(assignment?.startedAt || now);
        }
        out = {
          rideRequestId,
          assignmentId: safeText9(assignment?.id),
          otpStatus: "verified",
          verifiedAt: now,
          assignmentStatus: safeText9(assignment?.status || "started")
        };
      }, "driver_verify_ride_otp");
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "OTP_VERIFY_FAILED" });
    }
    publishRealtime("drivers:rides", {
      type: "ride_otp_verified",
      at: now,
      payload: out
    });
    publishRealtime(`ride:${rideRequestId}:bids`, {
      type: "ride_otp_verified",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });
  r.post("/assigned-rides/:rideRequestId/complete", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const rideRequestId = safeText9(req.params.rideRequestId);
    if (!rideRequestId) return res.status(400).json({ error: "RIDE_ID_REQUIRED" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let out = null;
    let completedRide = null;
    try {
      await mutateData((db) => {
        const anyDb = db;
        const assignments = Array.isArray(anyDb.rideAssignments) ? anyDb.rideAssignments : [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const assignment = assignments.find(
          (a) => safeText9(a?.rideRequestId) === rideRequestId && safeText9(a?.driverId) === driverId
        );
        if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
        const assignmentStatus = safeText9(assignment?.status).toLowerCase();
        if (["completed", "cancelled"].includes(assignmentStatus)) throw new Error("TRIP_ALREADY_CLOSED");
        const ride = rides.find((r2) => safeText9(r2?.id) === rideRequestId);
        if (ride && safeText9(ride?.rideOtp || "") && normalizeRideOtpStatus(ride) !== "verified") {
          throw new Error("OTP_VERIFICATION_REQUIRED");
        }
        assignment.status = "completed";
        assignment.updatedAt = now;
        assignment.completedAt = now;
        if (ride) {
          ride.status = "completed";
          ride.completedAt = now;
          completedRide = { ...ride };
        }
        out = { rideRequestId, assignmentId: safeText9(assignment?.id), status: "completed", completedAt: now };
      }, "driver_trip_complete");
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "TRIP_COMPLETE_FAILED" });
    }
    if (completedRide) {
      await ensureInvoiceForCompletedTransaction({
        table: "ev_cab_bookings",
        row: completedRide,
        source: "driver_complete_ride"
      }).catch(() => {
      });
    }
    publishRealtime("drivers:rides", {
      type: "ride_completed",
      at: now,
      payload: out
    });
    publishRealtime(`ride:${rideRequestId}:bids`, {
      type: "ride_completed",
      at: now,
      payload: out
    });
    return res.json({ ok: true, ...out });
  });
  r.post("/bids", requireDriverAuth, async (req, res) => {
    const parsed = DriverBidSchema2.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let bidOut = null;
    let rideMeta = null;
    try {
      await mutateData((db) => {
        const anyDb = db;
        if (!Array.isArray(anyDb.driverBids)) anyDb.driverBids = [];
        const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
        const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
        const vehicles = Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : [];
        const ride = rides.find((x) => safeText9(x?.id) === safeText9(parsed.data.rideRequestId));
        if (!ride) throw new Error("RIDE_NOT_FOUND");
        const rideStatus = safeText9(ride.status).toLowerCase();
        if (!["pending", "searching", "open"].includes(rideStatus)) throw new Error("RIDE_NOT_OPEN");
        const driver = drivers.find((x) => safeText9(x?.id) === driverId);
        if (!driver) throw new Error("DRIVER_NOT_FOUND");
        if (safeText9(driver.status).toLowerCase() !== "approved" || driver.active === false) throw new Error("DRIVER_NOT_APPROVED");
        const existing = anyDb.driverBids.find(
          (x) => safeText9(x?.rideRequestId) === safeText9(parsed.data.rideRequestId) && safeText9(x?.driverId) === driverId
        );
        const next = {
          id: existing?.id || makeId("bid"),
          rideRequestId: safeText9(parsed.data.rideRequestId),
          driverId,
          bidPrice: Number(parsed.data.bidPrice),
          etaMin: Number(parsed.data.etaMin),
          status: "active",
          createdAt: existing?.createdAt || now,
          updatedAt: now
        };
        if (existing) Object.assign(existing, next);
        else anyDb.driverBids.unshift(next);
        const vehicle = vehicles.find((x) => safeText9(x?.driverId) === driverId);
        bidOut = {
          id: next.id,
          rideRequestId: next.rideRequestId,
          driverId,
          driverName: safeText9(driver?.name),
          driverPhone: normalizePhone3(driver?.phone),
          driverRating: Number(driver?.rating || 4.5),
          carType: safeText9(vehicle?.vehicleType || ride?.vehicleType),
          carName: safeText9(vehicle?.model || vehicle?.carName || ""),
          bidPrice: next.bidPrice,
          etaMin: next.etaMin,
          status: next.status,
          createdAt: next.createdAt,
          updatedAt: next.updatedAt
        };
        rideMeta = {
          pickupLocation: safeText9(ride.pickupLocation),
          dropLocation: safeText9(ride.dropLocation)
        };
      }, "driver_bid");
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "BID_FAILED" });
    }
    publishRealtime(`ride:${safeText9(parsed.data.rideRequestId)}:bids`, {
      type: "bid_updated",
      at: now,
      payload: bidOut
    });
    publishRealtime("drivers:rides", {
      type: "bid_placed",
      at: now,
      payload: { ...bidOut, ...rideMeta }
    });
    return res.json({ ok: true, bid: bidOut });
  });
  r.get("/bids/history", requireDriverAuth, async (req, res) => {
    const claims = getAuthClaims(req);
    const driverId = safeText9(claims?.sub);
    try {
      await assertDriverExists(driverId);
    } catch (err) {
      const message = safeText9(err?.message || err);
      return res.status(driverRouteErrorStatus(message)).json({ error: message || "DRIVER_NOT_FOUND" });
    }
    const db = await readData();
    const anyDb = db;
    const bids = Array.isArray(anyDb.driverBids) ? anyDb.driverBids : [];
    const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
    const history = bids.filter((b) => safeText9(b?.driverId) === driverId).sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime()).map((bid) => {
      const ride = rides.find((r2) => safeText9(r2?.id) === safeText9(bid?.rideRequestId)) || {};
      return {
        bidId: safeText9(bid?.id),
        rideRequestId: safeText9(bid?.rideRequestId),
        bidPrice: Number(bid?.bidPrice || 0),
        etaMin: Number(bid?.etaMin || 0),
        bidStatus: safeText9(bid?.status || "active"),
        createdAt: safeText9(bid?.createdAt),
        updatedAt: safeText9(bid?.updatedAt),
        rideStatus: safeText9(ride?.status || ""),
        carName: safeText9((Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : []).find((v) => safeText9(v?.driverId) === driverId)?.model || ""),
        pickupLocation: safeText9(ride?.pickupLocation),
        dropLocation: safeText9(ride?.dropLocation),
        tripTime: safeText9(ride?.datetime),
        customerName: safeText9(ride?.userName),
        customerPhone: normalizePhone3(ride?.phone),
        finalFare: Number(ride?.paymentDueAmount || ride?.estimatedFare || 0),
        paymentStatus: deriveRidePaymentStatus(ride, null, bid)
      };
    });
    return res.json({ ok: true, bids: history });
  });
  r.get("/stream", requireDriverAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`event: hello
data: ${JSON.stringify({ ok: true, at: (/* @__PURE__ */ new Date()).toISOString() })}

`);
    const unsub = subscribeRealtime("drivers:rides", (event) => {
      res.write(`event: ${safeText9(event?.type || "message")}
data: ${JSON.stringify(event?.payload || {})}

`);
    });
    const ping = setInterval(() => {
      res.write(`event: ping
data: ${JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString() })}

`);
    }, 2e4);
    req.on("close", () => {
      clearInterval(ping);
      unsub();
      res.end();
    });
  });
  const DRIVER_ERROR_RESPONSES = {
    RIDE_NOT_FOUND: { status: 404, message: "That ride is no longer listed." },
    RIDE_NOT_OPEN: { status: 409, message: "This ride is no longer accepting offers." },
    RIDE_OTP_NOT_READY: { status: 409, message: "The rider's trip OTP has not been issued yet." },
    INVALID_RIDE_OTP: { status: 400, message: "That OTP does not match. Ask the rider to read it again." },
    OTP_VERIFICATION_REQUIRED: { status: 409, message: "Verify the rider's OTP before starting the trip." },
    TRIP_ALREADY_CLOSED: { status: 409, message: "This trip has already been closed." },
    ASSIGNMENT_NOT_FOUND: { status: 404, message: "You are not assigned to that ride." },
    DRIVER_NOT_FOUND: { status: 404, message: "We could not find that driver account." },
    DRIVER_NOT_APPROVED: { status: 403, message: "This driver account is not approved yet." },
    REQUEST_NOT_FOUND: { status: 404, message: "We could not find that request." },
    REGISTRATION_ALREADY_EXISTS: { status: 409, message: "A registration already exists for this number." },
    PHONE_ALREADY_IN_USE: { status: 409, message: "That phone number is already registered." },
    PHONE_CHANGE_REQUEST_ALREADY_PENDING: { status: 409, message: "A number change is already awaiting review." },
    PHONE_UNCHANGED: { status: 400, message: "That is already the number on this account." },
    PHONE_REQUIRED: { status: 400, message: "Enter a phone number." },
    NAME_REQUIRED: { status: 400, message: "Enter a name." },
    USERNAME_REQUIRED: { status: 400, message: "Choose a username." },
    USERNAME_ALREADY_IN_USE: { status: 409, message: "That username is already taken." },
    PASSWORD_REQUIRED: { status: 400, message: "Choose a password." },
    SUPABASE_NOT_CONFIGURED: { status: 503, message: "Storage is not available right now. Please try again later." },
    SUPABASE_UPLOAD_FAILED: { status: 502, message: "We could not store that upload. Please try again." }
  };
  r.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    const code = String(err?.message || err || "");
    const match = Object.keys(DRIVER_ERROR_RESPONSES).find((key) => code.includes(key));
    if (match) {
      const mapped = DRIVER_ERROR_RESPONSES[match];
      return res.status(mapped.status).json({ error: match, message: mapped.message });
    }
    return res.status(500).json({
      error: "DRIVER_REQUEST_FAILED",
      message: "Something went wrong on our side. Please try again in a moment."
    });
  });
  return r;
}

// src/server/index.ts
var PORT = Number(process.env.PORT || 8090);
var HOST = String(process.env.HOST || "0.0.0.0");
function normalizePath(raw) {
  const value = String(raw || "").trim();
  if (!value || value === "/") return "";
  return value.startsWith("/") ? value.replace(/\/+$/, "") : `/${value.replace(/\/+$/, "")}`;
}
var ADMIN_UI_PATH = normalizePath(process.env.ADMIN_UI_PATH || "/admin");
var ADMIN_TRAVEL_PATH = normalizePath(process.env.TRAVEL_UI_PATH || `${ADMIN_UI_PATH}/travel`);
var ADMIN_FOOD_PATH = normalizePath(process.env.FOOD_UI_PATH || `${ADMIN_UI_PATH}/food`);
var ADMIN_SUPPORT_PATH = normalizePath(process.env.SUPPORT_UI_PATH || `${ADMIN_UI_PATH}/support`);
var ADMIN_MART_VENDOR_PATH = normalizePath(process.env.MART_VENDOR_UI_PATH || `${ADMIN_UI_PATH}/mart-vendor`);
var REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "ADMIN_ALLOWED_EMAIL"];
var missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) {
  console.error(`[ev-admin] Missing required environment: ${missing.join(", ")}`);
  console.error("[ev-admin] Copy .env.example to .env and fill it in, then start again.");
  process.exit(1);
}
var app = (0, import_express5.default)();
app.disable("x-powered-by");
app.use((0, import_cors.default)({ origin: true, credentials: true }));
app.use(import_express5.default.json({ limit: "50mb" }));
app.use(import_express5.default.urlencoded({ extended: true, limit: "50mb" }));
var silentBot = { sendMessage: async () => void 0 };
app.use("/api/admin", adminRouter);
app.use("/api/mart-vendor", martVendorRouter());
app.use("/api/delivery", deliveryRouter(silentBot, []));
app.use("/api/driver", driverRouter());
var packageRoot2 = import_path7.default.resolve(__dirname, "..");
var publicDir = import_path7.default.join(packageRoot2, "public");
var indexFile = import_path7.default.join(publicDir, "index.html");
var staticOptions = { index: false, redirect: false };
var indexTemplate = "";
try {
  indexTemplate = import_fs4.default.readFileSync(indexFile, "utf8");
} catch {
  indexTemplate = "";
}
function sendIndexWithScope(res, scope) {
  if (!indexTemplate) return res.sendFile(indexFile);
  const dashboardPaths = {
    admin: ADMIN_UI_PATH,
    travel: ADMIN_TRAVEL_PATH,
    food: ADMIN_FOOD_PATH,
    support: ADMIN_SUPPORT_PATH,
    mart_vendor: ADMIN_MART_VENDOR_PATH
  };
  const inject = `<script>window.__EV_DASHBOARD_SCOPE=${JSON.stringify(scope)};window.__EV_DASHBOARD_PATHS=${JSON.stringify(dashboardPaths)};window.__EV_DASHBOARD_CANONICAL_PATH=${JSON.stringify(dashboardPaths[scope])};</script>`;
  const basePath = dashboardPaths[scope] || "";
  const withAbsoluteAssets = indexTemplate.replace(
    /\b(href|src)="\.\//g,
    `$1="${basePath}/`
  );
  const marker = "</head>";
  const html = withAbsoluteAssets.includes(marker) ? withAbsoluteAssets.replace(marker, `  ${inject}
${marker}`) : `${inject}
${withAbsoluteAssets}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}
[ADMIN_UI_PATH, ADMIN_TRAVEL_PATH, ADMIN_FOOD_PATH, ADMIN_SUPPORT_PATH, ADMIN_MART_VENDOR_PATH].filter((p, i, all) => p && all.indexOf(p) === i).forEach((mountPath) => app.use(mountPath, import_express5.default.static(publicDir, staticOptions)));
app.get([ADMIN_TRAVEL_PATH, `${ADMIN_TRAVEL_PATH}/`, `${ADMIN_TRAVEL_PATH}/*`], (_req, res) => sendIndexWithScope(res, "travel"));
app.get([ADMIN_FOOD_PATH, `${ADMIN_FOOD_PATH}/`, `${ADMIN_FOOD_PATH}/*`], (_req, res) => sendIndexWithScope(res, "food"));
app.get([ADMIN_SUPPORT_PATH, `${ADMIN_SUPPORT_PATH}/`, `${ADMIN_SUPPORT_PATH}/*`], (_req, res) => sendIndexWithScope(res, "support"));
app.get([ADMIN_MART_VENDOR_PATH, `${ADMIN_MART_VENDOR_PATH}/`, `${ADMIN_MART_VENDOR_PATH}/*`], (_req, res) => sendIndexWithScope(res, "mart_vendor"));
app.get([ADMIN_UI_PATH || "/", `${ADMIN_UI_PATH}/`, `${ADMIN_UI_PATH}/*`], (_req, res) => sendIndexWithScope(res, "admin"));
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ev-admin" }));
app.get("/", (_req, res) => res.redirect(ADMIN_UI_PATH || "/admin"));
app.listen(PORT, HOST, () => {
  const base = `http://localhost:${PORT}`;
  console.log("ExploreValley admin (standalone)");
  console.log(`  Admin        ${base}${ADMIN_UI_PATH}`);
  console.log(`  Food|Mart|Duty ${base}${ADMIN_FOOD_PATH}`);
  console.log(`  Travel       ${base}${ADMIN_TRAVEL_PATH}`);
  console.log(`  Support      ${base}${ADMIN_SUPPORT_PATH}`);
  console.log(`  Mart vendor  ${base}${ADMIN_MART_VENDOR_PATH}`);
});
