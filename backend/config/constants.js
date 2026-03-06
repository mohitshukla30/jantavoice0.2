module.exports = {
    DEPARTMENT_MAP: {
        Roads: { name: 'Public Works Department', ministry: 'Ministry of Road Transport & Highways', portal: 'cpgrams' },
        Water: { name: 'Water Supply Department', ministry: 'Ministry of Jal Shakti', portal: 'cpgrams' },
        Electricity: { name: 'Electricity Department', ministry: 'Ministry of Power', portal: 'cpgrams' },
        Sanitation: { name: 'Municipal Sanitation Department', ministry: 'Ministry of Housing & Urban Affairs', portal: 'swachhata' },
        Parks: { name: 'Parks & Recreation Department', ministry: 'Ministry of Environment', portal: 'cpgrams' },
        Safety: { name: 'Police / Safety Department', ministry: 'Ministry of Home Affairs', portal: 'cpgrams' },
        Noise: { name: 'Pollution Control Board', ministry: 'Ministry of Environment', portal: 'cpgrams' },
        'Air Quality': { name: 'Pollution Control Board', ministry: 'Ministry of Environment', portal: 'cpgrams' },
        Other: { name: 'General Grievance Cell', ministry: 'State Government', portal: 'cpgrams' }
    },
    PORTALS: {
        cpgrams: { name: 'CPGRAMS', url: 'https://pgportal.gov.in', trackUrl: 'https://pgportal.gov.in/Home/GrievanceStatus', avgDays: 14 },
        aaplesarkar: { name: 'Aaple Sarkar', url: 'https://aaplesarkar.mahaonline.gov.in', trackUrl: 'https://aaplesarkar.mahaonline.gov.in/en/Track', avgDays: 10 },
        swachhata: { name: 'Swachhata App', url: 'https://swachhata.co.in', trackUrl: 'https://swachhata.co.in/complaints', avgDays: 7 },
        delhi_cm: { name: 'Delhi CM Helpline', url: 'https://cmhelpline.delhi.gov.in', trackUrl: 'https://cmhelpline.delhi.gov.in/track', avgDays: 5 }
    },
    STATE_PORTAL_MAP: {
        Maharashtra: 'aaplesarkar',
        Delhi: 'delhi_cm',
        default: 'cpgrams'
    },
    ESCALATION_DAYS: { level1: 3, level2: 5, level3: 7 },
    FAKE_THRESHOLD: 0.80,
    AUTO_CHECK_MINUTES: 10
};
