export const resources = {
  en: {
    translation: {
      // --------------------
      // Tabs
      // --------------------
      tabs: {
        dashboard: "Dashboard",
        scan: "Scan",
        profile: "Profile",
        more: "More",
      },

      // --------------------
      // Common / Shared UI
      // --------------------
      common: {
        add: "+ Add",
        save: "Save",
        saveLog: "Save Log",
        saveEntry: "Save Entry",
        cancel: "Cancel",
        close: "Close",
        search: "Search",
        searchPlaceholder: "Search...",
        selected: "Selected",
        optional: "Optional",
        comingSoon: "Coming soon",
        noResultsTitle: "No results found",
        noResultsSub: "Try a different search keyword.",
      },

      // --------------------
      // Profile
      // --------------------
      profile: {
        title: "Profile",
        account: "Account",
        app: "App",
        personal: "Personal details",
        personalSub: "Name, phone, email",
        security: "Security",
        securitySub: "PIN, biometrics, device",
        notifications: "Notifications",
        notificationsSub: "Alerts & reminders",
        language: "Language",
        languageSub: "English",
        help: "Help & support",
        helpSub: "FAQs, contact",
        about: "About",
        aboutSub: "Version, terms",
        logout: "Logout",
        logoutSub: "Sign out of this device",
      },

      // --------------------
      // Dashboard
      // --------------------
      dashboard: {
        module: "Aquaculture",
        headline: "Farm overview at a glance",
        subHeadline: "Track ponds, logs, and scan crates/batches for traceability.",
        kpi: {
          totalPonds: "Total Ponds",
          totalPondsSub: "Active culture units",
          feedToday: "Feed Today",
          feedTodaySub: "Logs recorded today",
          waterChecks: "Water Checks",
          waterChecksSub: "pH / salinity / temp",
          health: "Health",
          healthSub: "Needs attention",
        },
        quickActions: "Quick Actions",
        actions: {
          scanQr: "Scan QR",
          scanQrSub: "Open crate/batch traceability instantly",
          demoTrace: "Try Demo Trace",
          demoTraceSub: "Opens a sample traceability timeline",
        },
        recentActivity: "Recent Activity",
        activity: {
          today0912: "Today 09:12",
          today1140: "Today 11:40",
          yesterday: "Yesterday",
          feedLog: "Feed Log",
          feedLogDesc: "Pond P-03 • 12 kg",
          waterCheck: "Water Check",
          waterCheckDesc: "Pond P-01 • pH 7.8",
          healthLog: "Health Log",
          healthLogDesc: "Pond P-02 • Normal",
        },
      },

      // --------------------
      // Scanner
      // --------------------
      scanner: {
        loading: "Loading camera…",
        permissionTitle: "Camera permission required",
        permissionSub: "Allow camera access to scan QR codes",
        allowCamera: "Allow Camera",
        instruction: "Align QR Code within frame to scan",
        scanItem: "SCAN ITEM",
      },

      // --------------------
      // "More" Sheet / Modules Menu
      // --------------------
      moreSheet: {
        title: "Aquaculture Modules",
        pondList: "Pond List",
        feedLog: "Feed Log",
        waterQuality: "Water Quality",
        healthMortality: "Health / Mortality",
      },

      // --------------------
      // Pond List
      // --------------------
      ponds: {
        title: "Pond List",
        subtitle: "View all ponds assigned to this farm.",
        searchPlaceholder: "Search pond (P-01, P-02...)",
        emptyTitle: "No ponds found",
        emptySub: "Try a different search keyword.",
        status: {
          active: "Active",
          maintenance: "Maintenance",
          inactive: "Inactive",
        },
      },

      // --------------------
      // Feed Log
      // --------------------
      feedLog: {
        title: "Feed Log",
        subtitle: "Record daily feed usage per pond.",
        searchPlaceholder: "Search (FL-001, pond, feed...)",
        emptyTitle: "No feed logs found",
        emptySub: "Try a different search keyword.",

        add: {
          title: "Add Feed Log",
          subtitle: "Record feed given to each pond.",
          date: "Date",
          feedingTime: "Feeding Time",
          selectPond: "Select Pond",
          feedType: "Feed Type",
          quantityKg: "Quantity (kg)",
          notes: "Notes",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderFeed: "e.g. CP 35% pellet",
          placeholderQty: "e.g. 18.5",
          placeholderNotes: "Optional...",
          saveBtn: "Save Feed Log",
        },
      },

      // --------------------
      // Water Quality
      // --------------------
      waterQuality: {
        title: "Water Quality",
        subtitle: "Record pH, DO, temperature and more per pond.",
        searchPlaceholder: "Search (WQ-001, pond, note...)",
        emptyTitle: "No water logs found",
        emptySub: "Try a different search keyword.",

        add: {
          title: "Add Water Quality",
          subtitle: "Record water parameters for audit and farm performance.",
          date: "Date",
          time: "Time",
          selectPond: "Select Pond",
          ph: "pH",
          doMgL: "DO (mg/L)",
          tempC: "Temp (°C)",
          salinityPpt: "Salinity (ppt)",
          ammoniaMgL: "Ammonia NH₃ (mg/L)",
          notes: "Notes",
          actionsTaken: "Actions Taken",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderNotes: "Optional...",
          placeholderActions: "e.g., started aerator, water exchange...",
          saveBtn: "Save Water Log",
        },
      },

      // --------------------
      // Health / Mortality
      // --------------------
      healthMortality: {
        title: "Health / Mortality",
        subtitle: "Record health issues and mortality events per pond.",
        searchPlaceholder: "Search (HM-001, pond, species...)",
        emptyTitle: "No health logs found",
        emptySub: "Try a different search keyword.",

        type: {
          health: "Health",
          mortality: "Mortality",
        },

        add: {
          title: "Add Health / Mortality",
          subtitle: "Record issues and actions taken per pond.",
          date: "Date",
          time: "Time",
          selectPond: "Select Pond",
          species: "Species",
          affected: "Affected Count",
          dead: "Dead Count",
          symptoms: "Symptoms / Observations",
          actionTaken: "Action Taken",
          notes: "Notes",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderSpecies: "e.g., Shrimp / Tilapia",
          placeholderOptional: "Optional...",
          saveBtn: "Save Entry",
        },
      },
    },
  },

  ta: {
    translation: {
      // --------------------
      // Tabs
      // --------------------
      tabs: {
        dashboard: "டாஷ்போர்ட்",
        scan: "ஸ்கேன்",
        profile: "சுயவிவரம்",
        more: "மேலும்",
      },

      // --------------------
      // Common / Shared UI
      // --------------------
      common: {
        add: "+ சேர்",
        save: "சேமி",
        saveLog: "பதிவை சேமி",
        saveEntry: "என்ட்ரி சேமி",
        cancel: "ரத்து",
        close: "மூடு",
        search: "தேடல்",
        searchPlaceholder: "தேடு...",
        selected: "தேர்ந்தெடுக்கப்பட்டது",
        optional: "விருப்பம்",
        comingSoon: "விரைவில்",
        noResultsTitle: "முடிவுகள் இல்லை",
        noResultsSub: "வேறு சொல் கொண்டு முயற்சிக்கவும்.",
      },

      // --------------------
      // Profile
      // --------------------
      profile: {
        title: "சுயவிவரம்",
        account: "கணக்கு",
        app: "ஆப்",
        personal: "தனிப்பட்ட விவரங்கள்",
        personalSub: "பெயர், மொபைல், மின்னஞ்சல்",
        security: "பாதுகாப்பு",
        securitySub: "PIN, பயோமேட்ரிக்ஸ், சாதனம்",
        notifications: "அறிவிப்புகள்",
        notificationsSub: "அலர்ட்கள் & நினைவூட்டல்கள்",
        language: "மொழி",
        languageSub: "தமிழ்",
        help: "உதவி & ஆதரவு",
        helpSub: "கேள்விகள், தொடர்பு",
        about: "பற்றி",
        aboutSub: "பதிப்பு, விதிமுறைகள்",
        logout: "வெளியேறு",
        logoutSub: "இந்த சாதனத்தில் இருந்து வெளியேறு",
      },

      // --------------------
      // Dashboard
      // --------------------
      dashboard: {
        module: "மீன் வளர்ப்பு (Aquaculture)",
        headline: "பண்ணை நிலவரம் ஒரு பார்வையில்",
        subHeadline: "குளங்கள், பதிவுகள் மற்றும் QR ஸ்கேன் மூலம் தடமறிதலை செய்யுங்கள்.",
        kpi: {
          totalPonds: "மொத்த குளங்கள்",
          totalPondsSub: "செயலில் உள்ள வளர்ப்பு அலகுகள்",
          feedToday: "இன்றைய தீனி",
          feedTodaySub: "இன்று பதிவுசெய்யப்பட்டது",
          waterChecks: "நீர் பரிசோதனை",
          waterChecksSub: "pH / உவர்ப்பு / வெப்பம்",
          health: "ஆரோக்கியம்",
          healthSub: "கவனம் தேவை",
        },
        quickActions: "விரைவு செயல்கள்",
        actions: {
          scanQr: "QR ஸ்கேன்",
          scanQrSub: "பெட்டி/பேட்ச் தடமறிதலை உடனே திறக்கவும்",
          demoTrace: "டெமோ தடமறிதல்",
          demoTraceSub: "மாதிரி தடமறிதல் காலவரிசையை திறக்கும்",
        },
        recentActivity: "சமீப செயல்பாடுகள்",
        activity: {
          today0912: "இன்று 09:12",
          today1140: "இன்று 11:40",
          yesterday: "நேற்று",
          feedLog: "தீனி பதிவு",
          feedLogDesc: "குளம் P-03 • 12 கிலோ",
          waterCheck: "நீர் பரிசோதனை",
          waterCheckDesc: "குளம் P-01 • pH 7.8",
          healthLog: "ஆரோக்கிய பதிவு",
          healthLogDesc: "குளம் P-02 • சாதாரணம்",
        },
      },

      // --------------------
      // Scanner
      // --------------------
      scanner: {
        loading: "கேமரா ஏற்றுகிறது…",
        permissionTitle: "கேமரா அனுமதி தேவை",
        permissionSub: "QR குறியீட்டை ஸ்கேன் செய்ய கேமரா அனுமதி வழங்கவும்",
        allowCamera: "அனுமதி வழங்கு",
        instruction: "ஸ்கேன் செய்ய QR குறியீட்டை ஃப்ரேமிற்குள் பொருத்தவும்",
        scanItem: "ஸ்கேன் செய்",
      },

      // --------------------
      // "More" Sheet / Modules Menu
      // --------------------
      moreSheet: {
        title: "மீன் வளர்ப்பு தொகுதிகள்",
        pondList: "குளங்கள் பட்டியல்",
        feedLog: "தீனி பதிவு",
        waterQuality: "நீர் தரம்",
        healthMortality: "ஆரோக்கியம் / இறப்பு",
      },

      // --------------------
      // Pond List
      // --------------------
      ponds: {
        title: "குளங்கள் பட்டியல்",
        subtitle: "இந்த பண்ணைக்கு ஒதுக்கப்பட்ட அனைத்து குளங்களையும் பாருங்கள்.",
        searchPlaceholder: "குளம் தேடு (P-01, P-02...)",
        emptyTitle: "குளங்கள் இல்லை",
        emptySub: "வேறு சொல் கொண்டு முயற்சிக்கவும்.",
        status: {
          active: "செயலில்",
          maintenance: "பராமரிப்பு",
          inactive: "செயலற்றது",
        },
      },

      // --------------------
      // Feed Log
      // --------------------
      feedLog: {
        title: "தீனி பதிவு",
        subtitle: "ஒவ்வொரு குளத்திற்கும் தினசரி தீனி பதிவை செய்யுங்கள்.",
        searchPlaceholder: "தேடு (FL-001, குளம், தீனி...)",
        emptyTitle: "தீனி பதிவுகள் இல்லை",
        emptySub: "வேறு சொல் கொண்டு முயற்சிக்கவும்.",

        add: {
          title: "தீனி பதிவு சேர்",
          subtitle: "ஒவ்வொரு குளத்திற்கும் கொடுக்கப்பட்ட தீனியை பதிவு செய்யுங்கள்.",
          date: "தேதி",
          feedingTime: "நேரம்",
          selectPond: "குளம் தேர்வு",
          feedType: "தீனி வகை",
          quantityKg: "அளவு (கிலோ)",
          notes: "குறிப்பு",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderFeed: "உ.தா. CP 35% pellet",
          placeholderQty: "உ.தா. 18.5",
          placeholderNotes: "விருப்பம்...",
          saveBtn: "தீனி பதிவை சேமி",
        },
      },

      // --------------------
      // Water Quality
      // --------------------
      waterQuality: {
        title: "நீர் தரம்",
        subtitle: "pH, DO, வெப்பம் மற்றும் மற்றவை பதிவுசெய்யவும்.",
        searchPlaceholder: "தேடு (WQ-001, குளம், குறிப்பு...)",
        emptyTitle: "நீர் பதிவுகள் இல்லை",
        emptySub: "வேறு சொல் கொண்டு முயற்சிக்கவும்.",

        add: {
          title: "நீர் தரம் சேர்",
          subtitle: "ஆடிட் மற்றும் செயல்திறன் காக நீர் அளவுகளை பதிவு செய்யுங்கள்.",
          date: "தேதி",
          time: "நேரம்",
          selectPond: "குளம் தேர்வு",
          ph: "pH",
          doMgL: "DO (mg/L)",
          tempC: "வெப்பம் (°C)",
          salinityPpt: "உவர்ப்பு (ppt)",
          ammoniaMgL: "அமோனியா NH₃ (mg/L)",
          notes: "குறிப்பு",
          actionsTaken: "எடுத்த நடவடிக்கை",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderNotes: "விருப்பம்...",
          placeholderActions: "உ.தா. ஏரேட்டர் தொடக்கம், நீர் மாற்றம்...",
          saveBtn: "நீர் பதிவை சேமி",
        },
      },

      // --------------------
      // Health / Mortality
      // --------------------
      healthMortality: {
        title: "ஆரோக்கியம் / இறப்பு",
        subtitle: "ஆரோக்கிய பிரச்சனை மற்றும் இறப்பு நிகழ்வுகளை பதிவு செய்யுங்கள்.",
        searchPlaceholder: "தேடு (HM-001, குளம், வகை...)",
        emptyTitle: "ஆரோக்கிய பதிவுகள் இல்லை",
        emptySub: "வேறு சொல் கொண்டு முயற்சிக்கவும்.",

        type: {
          health: "ஆரோக்கியம்",
          mortality: "இறப்பு",
        },

        add: {
          title: "ஆரோக்கியம் / இறப்பு சேர்",
          subtitle: "குளத்திற்கு ஏற்ப பிரச்சனை மற்றும் நடவடிக்கையை பதிவு செய்யுங்கள்.",
          date: "தேதி",
          time: "நேரம்",
          selectPond: "குளம் தேர்வு",
          species: "வகை (Species)",
          affected: "பாதிக்கப்பட்ட எண்ணிக்கை",
          dead: "இறந்த எண்ணிக்கை",
          symptoms: "அறிகுறிகள் / கவனிப்புகள்",
          actionTaken: "எடுத்த நடவடிக்கை",
          notes: "குறிப்பு",
          placeholderDate: "MM/DD/YYYY",
          placeholderTime: "hh:mm AM/PM",
          placeholderSpecies: "உ.தா. இறால் / திலாப்பியா",
          placeholderOptional: "விருப்பம்...",
          saveBtn: "என்ட்ரி சேமி",
        },
      },
    },
  },
} as const;

export const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
] as const;
