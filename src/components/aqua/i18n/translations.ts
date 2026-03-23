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
        remove: "Remove",
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
        traceabilityLabel: "Aquaculture Traceability",
        heroTitle: "Farm Approval First, Pond Registration Next",
        heroDesc: "Register farm and farmer details first. After farm approval, use the approved farm ID to create pond registration.",

        overview: "Overview",
        quickActions: "Quick Actions",
        recentStatus: "Recent Status",

        totalFarms: "Total Farms",
        totalFarmsSub: "Registered under this account",
        approvedFarms: "Approved Farms",
        approvedFarmsSub: "Eligible for pond creation",
        farmPending: "Farm Pending",
        farmPendingSub: "Waiting for admin approval",
        totalPonds: "Total Ponds",
        totalPondsSub: "Linked to approved farms",
        pondPending: "Pond Pending",
        pondPendingSub: "Submitted for approval",
        approvedPonds: "Approved Ponds",
        approvedPondsSub: "Ready for downstream flow",

        registerFarm: "Register Farm & Farmer",
        registerFarmSub: "Start the first onboarding flow. This submits farm and farmer details for approval.",
        createPond: "Create Pond",
        createPondSub: "Create pond for approved farm: {{farmName}}",
        createPondLocked: "Locked until a farm is approved. Pond registration must use an approved farm ID.",
        viewFarmStatus: "View Farm Status",
        viewFarmStatusSub: "Check submitted farm registrations and their approval progress.",
        viewPondList: "View Pond List",
        viewPondListSub: "See all ponds created under approved farms.",
        qrScanner: "QR Scanner",
        qrScannerSub: "Scan approved pond QR when QR-based flow is available.",

        farmWaiting: "Farm Registration Waiting for Approval",
        farmWaitingDesc: "Farm and farmer details submitted. Pond creation must wait until farm is approved.",
        farmApprovedTitle: "Farm Registration Approved",
        farmApprovedDesc: "Approved farm is ready for pond creation. Use farm ID {{farmId}} for the next step.",
        pondUnlocked: "Pond Registration Unlocked",
        pondUnlockedDesc: "You can now create pond details under {{farmName}} using the approved farm ID.",
        pondLocked: "Pond Registration Locked",
        pondLockedDesc: "Pond registration is blocked until at least one farm gets admin approval.",
        pondPendingStatus: "Submitted Pond Waiting for Approval",
        pondPendingStatusDesc: "A pond registration has been submitted and is currently under review.",
        noPondPending: "No Pond Pending Approval",
        noPondPendingDesc: "All pond records are either approved or not yet submitted.",
      },

      // --------------------
      // Registration — Farm & Pond
      // --------------------
      registration: {
        // Common
        next: "Next",
        submit: "Submit",
        back: "Back",
        cancel: "Cancel",
        capturePhoto: "Capture Photo",
        retake: "Retake",
        review: "Review & Submit",
        submitting: "Submitting…",
        submitted: "Submitted",
        success: "Success",
        failed: "Failed",

        // Farm details
        farmRegistrationHeader: "Farm Registration",
        farmRegistrationSubheader: "Farm & Farmer Details",
        farmerSection: "Farmer Details",
        farmSection: "Farm Details",
        farmDetails: "Farm Details",
        farmName: "Farm Name",
        farmNamePlaceholder: "Enter farm name",
        farmAddress: "Farm Address",
        farmAddressPlaceholder: "Enter farm address",
        farmArea: "Total Farm Area",
        farmAreaPlaceholder: "Enter farm area",
        farmerName: "Farmer Name",
        farmerNamePlaceholder: "Enter farmer name",
        mobileNumber: "Mobile Number",
        mobileNumberPlaceholder: "10 digit mobile",
        email: "Email",
        emailPlaceholder: "Enter email",
        aadhaarNumber: "Aadhaar Number",
        aadhaarPlaceholder: "12 digit Aadhaar",
        country: "Country",
        state: "State",
        district: "District",
        location: "Location / Village",
        waterSource: "Water Source",
        waterSourcePlaceholder: "Ex: Borewell / Canal / River",
        selectCountry: "Select Country",
        selectState: "Select State",
        selectDistrict: "Select District",
        selectLocation: "Select Location",
        selectWaterSource: "Select Water Source",
        selectCountryFirst: "Select country first",
        selectStateFirst: "Select state first",
        selectDistrictFirst: "Select district first",
        latitude: "Latitude",
        longitude: "Longitude",
        autoDetected: "Auto-detected",
        coordsFetching: "Fetching...",
        gpsDetecting: "Fetching your current GPS coordinates...",
        gpsSuccess: "GPS coordinates detected successfully.",
        gpsNoCoords: "Could not detect coordinates. Please check location permissions.",
        captureFarmGate: "Capture Farm Gate Photo",
        pondCount: "Number of Ponds",
        pondCountPlaceholder: "Enter pond count",
        farmGateImage: "Farm Gate Image",
        farmGateDesc: "Capture a real-time photo at the farm gate. Gallery upload is not allowed.",
        captureBtn: "Capture Farm Image",
        retakeBtn: "Retake Farm Image",
        imageCapturedSuccess: "Farm image attached successfully",
        tapToPreview: "Tap image to preview",
        step1of2: "Step 1 of 2",
        step2of2: "Step 2 of 2",
        noOptions: "No options available",
        loading: "Loading...",

        // Camera / capture
        cameraPermissionTitle: "Camera Permission Needed",
        cameraPermissionDesc: "Allow camera access to capture the farm gate image.",
        allowCamera: "Allow Camera",
        captureFarmGateTitle: "Capture Farm Image",
        cameraReadyCapture: "Capture the real-time farm gate image",
        cameraLoading: "Loading camera...",
        capturing: "Capturing...",
        tapToCapture: "Tap to capture",
        preparingCamera: "Preparing camera...",
        reviewImage: "Review Captured Image",
        retakeOrUse: "Retake or use this farm gate image",
        useThisImage: "Use This Image",

        // Pond details extra
        selectFarm: "Select Approved Farm",
        selectFarmSub: "Ponds will be linked to this farm.",
        noApprovedFarms: "No approved farms found",
        noApprovedFarmsWarning: "No approved farms yet. Complete farm registration and wait for approval first.",
        noApprovedFarmsAvailable: "No approved farms available.",
        pondImageAttached: "Pond image attached",
        addAnotherPond: "+ Add Another Pond",
        loadingSpecies: "Loading species...",
        noSpeciesAvailable: "No species available.",
        retakePondImage: "Retake Pond Image",
        pondImagePreview: "Pond Image Preview",
        fetchingGps: "Fetching GPS coordinates...",
        gpsNoPermission: "Could not detect GPS. Check location permissions.",

        // Farm review
        farmReviewTitle: "Farm Review",
        farmerDetails: "Farmer Details",
        farmDetailsLabel: "Farm Details",
        locationDetails: "Location",
        farmGatePhoto: "Farm Gate Photo",
        submitFarm: "Submit Farm Registration",
        submitFarmSuccess: "Farm registration submitted successfully.",
        submitFarmFailed: "Farm registration submission failed.",

        // Pond details
        pondDetails: "Pond Details",
        pondName: "Pond Name",
        pondNamePlaceholder: "Enter pond name",
        pondArea: "Pond Area (acres)",
        pondAreaPlaceholder: "e.g. 2.5",
        cultureType: "Culture Type",
        selectCultureType: "Select Culture Type",
        species: "Species",
        selectSpecies: "Select Species",
        captureImage: "Capture Pond Image",

        // Pond review
        pondReviewTitle: "Pond Review",
        submitPond: "Submit Pond Registration",
        submitPondSuccess: "Pond registration submitted successfully.",
        submitPondFailed: "Pond registration submission failed.",

        // Approvals
        approvalsLabel: "Approvals",
        loadingPending: "Loading pending items...",
        loadingApproved: "Loading approved items...",
        tapToRetry: "Tap to retry",
        noPendingTitle: "No Pending Items",
        noPendingDesc: "All your registrations have been reviewed.",
        noApprovedTitle: "No Approved Items Yet",
        noApprovedDesc: "Your registrations are under review. Pull down to refresh.",
        whatNext: "What happens next?",
        whatNextDesc: "• Details are under admin review\n• Pond Code will be assigned after approval\n• QR code will be available after approval\n• Pull down to refresh status",
        backToDashboard: "Back to Dashboard",
        farmLabel: "Farm",
        pendingStatus: "Pending",
        approvedStatus: "Approved",

        pendingTitle: "Pending Approvals",
        approvedTitle: "Approved",
        pendingFarms: "Pending Farms",
        approvedFarms: "Approved Farms",
        pendingPonds: "Pending Ponds",
        approvedPonds: "Approved Ponds",
        noDataFarms: "No farm records found.",
        noDataPonds: "No pond records found.",
        pullToRefresh: "Pull down to refresh",
        areaLabel: "Area",
        submittedOn: "Submitted",
        pondCode: "Pond Code",
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
        remove: "நீக்கு",
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
        traceabilityLabel: "மீன் வளர்ப்பு தடமறிதல்",
        heroTitle: "முதலில் பண்ணை ஒப்புதல், பிறகு குளம் பதிவு",
        heroDesc: "முதலில் பண்ணை மற்றும் விவசாயி விவரங்களை பதிவு செய்யவும். ஒப்புதலுக்கு பிறகு, அங்கீகரிக்கப்பட்ட பண்ணை ID பயன்படுத்தி குளம் பதிவு செய்யவும்.",

        overview: "மேலோட்டம்",
        quickActions: "விரைவு செயல்கள்",
        recentStatus: "சமீப நிலை",

        totalFarms: "மொத்த பண்ணைகள்",
        totalFarmsSub: "இந்த கணக்கில் பதிவான பண்ணைகள்",
        approvedFarms: "அங்கீகரிக்கப்பட்டவை",
        approvedFarmsSub: "குளம் உருவாக்க தகுதியான பண்ணைகள்",
        farmPending: "நிலுவையில் பண்ணை",
        farmPendingSub: "நிர்வாக ஒப்புதலுக்காக காத்திருக்கிறது",
        totalPonds: "மொத்த குளங்கள்",
        totalPondsSub: "அங்கீகரிக்கப்பட்ட பண்ணையில் உள்ளவை",
        pondPending: "நிலுவையில் குளம்",
        pondPendingSub: "ஒப்புதலுக்கு சமர்ப்பிக்கப்பட்டது",
        approvedPonds: "அங்கீகரிக்கப்பட்ட குளங்கள்",
        approvedPondsSub: "அடுத்த நடவடிக்கைக்கு தயார்",

        registerFarm: "பண்ணை & விவசாயி பதிவு",
        registerFarmSub: "பண்ணை மற்றும் விவசாயி விவரங்களை ஒப்புதலுக்கு சமர்ப்பிக்க இங்கே தொடங்கவும்.",
        createPond: "குளம் உருவாக்கு",
        createPondSub: "அங்கீகரிக்கப்பட்ட பண்ணைக்கு குளம் உருவாக்கு: {{farmName}}",
        createPondLocked: "பண்ணை ஒப்பு பெறும் வரை குளம் பதிவு பூட்டப்பட்டுள்ளது.",
        viewFarmStatus: "பண்ணை நிலையை பார்",
        viewFarmStatusSub: "சமர்ப்பிக்கப்பட்ட பண்ணை பதிவுகள் மற்றும் ஒப்புதல் நிலை.",
        viewPondList: "குளங்கள் பட்டியல்",
        viewPondListSub: "அங்கீகரிக்கப்பட்ட பண்ணையில் உள்ள அனைத்து குளங்களும்.",
        qrScanner: "QR ஸ்கேனர்",
        qrScannerSub: "அங்கீகரிக்கப்பட்ட குளத்தின் QR ஸ்கேன் செய்யவும்.",

        farmWaiting: "பண்ணை பதிவு ஒப்புதலுக்காக காத்திருக்கிறது",
        farmWaitingDesc: "பண்ணை விவரங்கள் சமர்ப்பிக்கப்பட்டன. பண்ணை ஒப்பு வரும் வரை குளம் பதிவு காத்திருக்க வேண்டும்.",
        farmApprovedTitle: "பண்ணை பதிவு அங்கீகரிக்கப்பட்டது",
        farmApprovedDesc: "அங்கீகரிக்கப்பட்ட பண்ணை குளம் உருவாக்க தயார். பண்ணை ID {{farmId}} பயன்படுத்தவும்.",
        pondUnlocked: "குளம் பதிவு திறக்கப்பட்டது",
        pondUnlockedDesc: "{{farmName}}-ல் அங்கீகரிக்கப்பட்ட பண்ணை ID பயன்படுத்தி குளம் உருவாக்கலாம்.",
        pondLocked: "குளம் பதிவு பூட்டப்பட்டது",
        pondLockedDesc: "குறைந்தது ஒரு பண்ணை நிர்வாக ஒப்புதல் பெறும் வரை குளம் பதிவு தடுக்கப்பட்டுள்ளது.",
        pondPendingStatus: "சமர்ப்பிக்கப்பட்ட குளம் ஒப்புதலுக்காக காத்திருக்கிறது",
        pondPendingStatusDesc: "குளம் பதிவு சமர்ப்பிக்கப்பட்டு தற்போது மதிப்பாய்வில் உள்ளது.",
        noPondPending: "ஒப்புதலுக்காக குளம் எதுவும் இல்லை",
        noPondPendingDesc: "அனைத்து குளம் பதிவுகளும் ஏற்கனவே அங்கீகரிக்கப்பட்டவை அல்லது இன்னும் சமர்ப்பிக்கப்படவில்லை.",
      },

      // --------------------
      // Registration — Farm & Pond
      // --------------------
      registration: {
        next: "அடுத்து",
        submit: "சமர்ப்பி",
        back: "திரும்பு",
        cancel: "ரத்து",
        capturePhoto: "புகைப்படம் எடு",
        retake: "மீண்டும் எடு",
        review: "மதிப்பாய்வு & சமர்ப்பி",
        submitting: "சமர்ப்பிக்கிறது…",
        submitted: "சமர்ப்பிக்கப்பட்டது",
        success: "வெற்றி",
        failed: "தோல்வி",

        farmRegistrationHeader: "பண்ணை பதிவு",
        farmRegistrationSubheader: "பண்ணை & விவசாயி விவரங்கள்",
        farmerSection: "விவசாயி விவரங்கள்",
        farmSection: "பண்ணை விவரங்கள்",
        farmDetails: "பண்ணை விவரங்கள்",
        farmName: "பண்ணை பெயர்",
        farmNamePlaceholder: "பண்ணை பெயரை உள்ளிடவும்",
        farmAddress: "பண்ணை முகவரி",
        farmAddressPlaceholder: "பண்ணை முகவரியை உள்ளிடவும்",
        farmArea: "மொத்த பண்ணை பரப்பு",
        farmAreaPlaceholder: "பண்ணை பரப்பை உள்ளிடவும்",
        farmerName: "விவசாயி பெயர்",
        farmerNamePlaceholder: "விவசாயி பெயரை உள்ளிடவும்",
        mobileNumber: "மொபைல் எண்",
        mobileNumberPlaceholder: "10 இலக்க மொபைல்",
        email: "மின்னஞ்சல்",
        emailPlaceholder: "மின்னஞ்சலை உள்ளிடவும்",
        aadhaarNumber: "ஆதார் எண்",
        aadhaarPlaceholder: "12 இலக்க ஆதார்",
        country: "நாடு",
        state: "மாநிலம்",
        district: "மாவட்டம்",
        location: "இடம் / கிராமம்",
        waterSource: "நீர் ஆதாரம்",
        waterSourcePlaceholder: "எ.கா: ஆழ்துளை / கால்வாய் / நதி",
        selectCountry: "நாட்டை தேர்வு செய்யவும்",
        selectState: "மாநிலத்தை தேர்வு செய்யவும்",
        selectDistrict: "மாவட்டத்தை தேர்வு செய்யவும்",
        selectLocation: "இடத்தை தேர்வு செய்யவும்",
        selectWaterSource: "நீர் ஆதாரத்தை தேர்வு செய்யவும்",
        selectCountryFirst: "முதலில் நாட்டை தேர்வு செய்யவும்",
        selectStateFirst: "முதலில் மாநிலத்தை தேர்வு செய்யவும்",
        selectDistrictFirst: "முதலில் மாவட்டத்தை தேர்வு செய்யவும்",
        latitude: "அட்சரேகை",
        longitude: "தீர்க்கரேகை",
        autoDetected: "தானாக கண்டறியப்பட்டது",
        coordsFetching: "பெறுகிறது...",
        gpsDetecting: "தற்போதைய GPS இருப்பிடம் பெறுகிறது...",
        gpsSuccess: "GPS இருப்பிடம் வெற்றிகரமாக கண்டறியப்பட்டது.",
        gpsNoCoords: "இருப்பிடம் கண்டறிய முடியவில்லை. இருப்பிட அனுமதியை சரிபார்க்கவும்.",
        captureFarmGate: "பண்ணை வாயில் புகைப்படம் எடு",
        pondCount: "குளங்களின் எண்ணிக்கை",
        pondCountPlaceholder: "குளம் எண்ணிக்கையை உள்ளிடவும்",
        farmGateImage: "பண்ணை வாயில் படம்",
        farmGateDesc: "பண்ணை வாயிலில் நேரடி புகைப்படம் எடுக்கவும். கேலரி பதிவேற்றம் அனுமதிக்கப்படாது.",
        captureBtn: "பண்ணை படம் எடு",
        retakeBtn: "மீண்டும் படம் எடு",
        imageCapturedSuccess: "பண்ணை படம் வெற்றிகரமாக இணைக்கப்பட்டது",
        tapToPreview: "முன்னோட்டம் பார்க்க படத்தை தட்டவும்",
        step1of2: "படி 1 / 2",
        step2of2: "படி 2 / 2",
        noOptions: "விருப்பங்கள் இல்லை",
        loading: "ஏற்றுகிறது...",

        // Camera / capture
        cameraPermissionTitle: "கேமரா அனுமதி தேவை",
        cameraPermissionDesc: "பண்ணை வாயில் படம் எடுக்க கேமரா அனுமதி வழங்கவும்.",
        allowCamera: "அனுமதி வழங்கு",
        captureFarmGateTitle: "பண்ணை படம் எடு",
        cameraReadyCapture: "பண்ணை வாயிலில் நேரடி படம் எடுக்கவும்",
        cameraLoading: "கேமரா ஏற்றுகிறது...",
        capturing: "எடுக்கிறது...",
        tapToCapture: "படம் எடுக்க தட்டவும்",
        preparingCamera: "கேமரா தயாராகிறது...",
        reviewImage: "படத்தை மதிப்பாய்வு செய்யவும்",
        retakeOrUse: "மீண்டும் எடு அல்லது படத்தை பயன்படுத்தவும்",
        useThisImage: "இந்த படத்தை பயன்படுத்து",

        // Pond details extra
        selectFarm: "அங்கீகரிக்கப்பட்ட பண்ணையை தேர்வு செய்யவும்",
        selectFarmSub: "குளங்கள் இந்த பண்ணையுடன் இணைக்கப்படும்.",
        noApprovedFarms: "அங்கீகரிக்கப்பட்ட பண்ணைகள் இல்லை",
        noApprovedFarmsWarning: "இன்னும் அங்கீகரிக்கப்பட்ட பண்ணைகள் இல்லை. முதலில் பண்ணை பதிவை முடித்து ஒப்புதலுக்காக காத்திருக்கவும்.",
        noApprovedFarmsAvailable: "அங்கீகரிக்கப்பட்ட பண்ணைகள் இல்லை.",
        pondImageAttached: "குளம் படம் இணைக்கப்பட்டது",
        addAnotherPond: "+ மேலும் ஒரு குளம் சேர்",
        loadingSpecies: "இனங்களை ஏற்றுகிறது...",
        noSpeciesAvailable: "இனங்கள் இல்லை.",
        retakePondImage: "குளம் படம் மீண்டும் எடு",
        pondImagePreview: "குளம் படம் முன்னோட்டம்",
        fetchingGps: "GPS இருப்பிடம் பெறுகிறது...",
        gpsNoPermission: "GPS கண்டறிய முடியவில்லை. இருப்பிட அனுமதியை சரிபார்க்கவும்.",

        farmReviewTitle: "பண்ணை மதிப்பாய்வு",
        farmerDetails: "விவசாயி விவரங்கள்",
        farmDetailsLabel: "பண்ணை விவரங்கள்",
        locationDetails: "இடம்",
        farmGatePhoto: "பண்ணை வாயில் புகைப்படம்",
        submitFarm: "பண்ணை பதிவை சமர்ப்பி",
        submitFarmSuccess: "பண்ணை பதிவு வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.",
        submitFarmFailed: "பண்ணை பதிவு சமர்ப்பிக்கப்படவில்லை.",

        pondDetails: "குளம் விவரங்கள்",
        pondName: "குளம் பெயர்",
        pondNamePlaceholder: "குளம் பெயரை உள்ளிடவும்",
        pondArea: "குளம் பரப்பு (ஏக்கர்)",
        pondAreaPlaceholder: "உ.தா. 2.5",
        cultureType: "வளர்ப்பு வகை",
        selectCultureType: "வளர்ப்பு வகை தேர்வு செய்யவும்",
        species: "இனம்",
        selectSpecies: "இனத்தை தேர்வு செய்யவும்",
        captureImage: "குளம் புகைப்படம் எடு",

        pondReviewTitle: "குளம் மதிப்பாய்வு",
        submitPond: "குளம் பதிவை சமர்ப்பி",
        submitPondSuccess: "குளம் பதிவு வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.",
        submitPondFailed: "குளம் பதிவு சமர்ப்பிக்கப்படவில்லை.",

        approvalsLabel: "ஒப்புதல்கள்",
        loadingPending: "நிலுவை பொருட்களை ஏற்றுகிறது...",
        loadingApproved: "அங்கீகரிக்கப்பட்டவற்றை ஏற்றுகிறது...",
        tapToRetry: "மீண்டும் முயற்சிக்க தட்டவும்",
        noPendingTitle: "நிலுவை பொருட்கள் இல்லை",
        noPendingDesc: "உங்கள் அனைத்து பதிவுகளும் மதிப்பாய்வு செய்யப்பட்டன.",
        noApprovedTitle: "இன்னும் அங்கீகரிக்கப்படவில்லை",
        noApprovedDesc: "உங்கள் பதிவுகள் மதிப்பாய்வில் உள்ளன. புதுப்பிக்க கீழே இழுக்கவும்.",
        whatNext: "அடுத்து என்ன ஆகும்?",
        whatNextDesc: "• விவரங்கள் நிர்வாக மதிப்பாய்வில் உள்ளன\n• ஒப்புதலுக்கு பிறகு குளம் குறியீடு ஒதுக்கப்படும்\n• ஒப்புதலுக்கு பிறகு QR குறியீடு கிடைக்கும்\n• நிலை புதுப்பிக்க கீழே இழுக்கவும்",
        backToDashboard: "டாஷ்போர்டுக்கு திரும்பு",
        farmLabel: "பண்ணை",
        pendingStatus: "நிலுவையில்",
        approvedStatus: "அங்கீகரிக்கப்பட்டது",

        pendingTitle: "நிலுவையில் உள்ளவை",
        approvedTitle: "அங்கீகரிக்கப்பட்டவை",
        pendingFarms: "நிலுவை பண்ணைகள்",
        approvedFarms: "அங்கீகரிக்கப்பட்ட பண்ணைகள்",
        pendingPonds: "நிலுவை குளங்கள்",
        approvedPonds: "அங்கீகரிக்கப்பட்ட குளங்கள்",
        noDataFarms: "பண்ணை பதிவுகள் இல்லை.",
        noDataPonds: "குளம் பதிவுகள் இல்லை.",
        pullToRefresh: "புதுப்பிக்க கீழே இழுக்கவும்",
        areaLabel: "பரப்பு",
        submittedOn: "சமர்ப்பிக்கப்பட்டது",
        pondCode: "குளம் குறியீடு",
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
