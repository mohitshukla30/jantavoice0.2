module.exports = {
    portals: {
        CPGRAMS: {
            name: "CPGRAMS (Central Government)",
            url: "https://pgportal.gov.in",
            apiBase: "https://pgportal.gov.in/api",
            trackingUrl: "https://pgportal.gov.in/Home/GrievanceStatus",
            categories: ["Roads", "Water", "Electricity", "Sanitation", "Safety"],
            states: ["all"],
            submissionMethod: "form_scraping",  // no public API, use form submission
            trackingMethod: "scraping"
        },
        MGNREGA: {
            name: "MGNREGA Portal",
            url: "https://nrega.nic.in",
            apiBase: "https://nrega.nic.in/netnrega",
            categories: ["Roads", "Water"],
            trackingMethod: "api"
        },
        Maharashtra_CRZ: {
            name: "Maharashtra Aaple Sarkar",
            url: "https://aaplesarkar.mahaonline.gov.in",
            trackingUrl: "https://aaplesarkar.mahaonline.gov.in/en/Track",
            categories: ["all"],
            states: ["Maharashtra"],
            submissionMethod: "form",
            trackingMethod: "scraping"
        },
        Delhi_CM: {
            name: "Delhi CM Helpline",
            apiBase: "https://cmhelpline.delhi.gov.in",
            categories: ["all"],
            states: ["Delhi"],
            trackingMethod: "scraping"
        },
        Swachhata: {
            name: "Swachhata App Portal",
            apiBase: "https://swachhata.co.in/api/v2",
            categories: ["Sanitation"],
            states: ["all"],
            trackingMethod: "api"
        }
    }
};
