export const SUPPORTING_DOC_DESCRIPTIONS: Record<string, string> = {
    'SD-01': 'Annexes 1-5',
    'SD-04': 'Certification for proposed “Raising of Grade”',
    'SD-05': 'Certification for RoCond Updating',
    'SD-07': 'Certification of No Widening',
    'SD-08': 'Certification to Justify Request',
    'SD-09': 'Detailed Engineering Design (DED)/Preliminary Plans',
    'SD-10': 'Geotagged Photos',
    'SD-11': 'Hydraulic and Hydrologic Analysis',
    'SD-12': 'Modification Form/Variation Order/Change Order/As-Built Plan',
    'SD-15': 'Program of Work (POW)',
    'SD-17': 'Project Profile',
    'SD-18': 'ROW Certification',
    'SD-19': 'Straight Line Diagram (SLD)',
    'SD-20': 'Technical Study/Evaluation/Feasibility Study/Flood Control Master Plan',
    'SD-22': 'Outside of High Hazard Areas Certification',
    'SD-23': 'Detailed Unit Price Analysis',
    'SD-24': "RD's Endorsement",
    'SD-25': 'Project Impact Analysis (PIA)',
    'SD-26': 'DPWH Flood Control Checklist',
    'SD-27': 'Certificate of Compliance to D.O. 23, s. 2015',
    'SD-28': 'BP 202',
    'SD-29': 'Location Map',
    'SD-31': 'Road Safety Reports',
    'SD-32': 'MOA with LGU',
    'SD-33': 'Canvass of Materials',
    'SD-34': 'Consolidated Transmittal Letter',
    'SD-35': 'Certification on National Security/Development',
    'SD-36': 'Technical Necessity Certification',
    'SD-37': 'Consolidated ROW Availability (ROWA)',
    'SD-38': 'Individual Project Briefer',
    'SD-39': 'Certification of No Double Funding',
    'SD-40': 'MYCPPM (Convergence Matrix)',
    'SD-41': 'Geotechnical Study',
};

// Internal mapping helper from PAP Description to SD Codes
const PAP_MAPPING: Record<string, string[]> = {
    "DRAINAGE": ["SD-08", "SD-10", "SD-12", "SD-15", "SD-18", "SD-19", "SD-23"],
    "PREVENTIVE MAINTENANCE": ["SD-05", "SD-10", "SD-12", "SD-15", "SD-19", "SD-23"],
    "SLOPE COLLAPSE": ["SD-01", "SD-09", "SD-10", "SD-12", "SD-15", "SD-18", "SD-19", "SD-41"],
    "DAMAGED PAVED ROADS": ["SD-04", "SD-05", "SD-10", "SD-12", "SD-15", "SD-19", "SD-23"],
    "NEW BRIDGES": ["SD-09", "SD-10", "SD-11", "SD-15", "SD-17"],
    "REPAIR OF PERMANENT BRIDGES": ["SD-10", "SD-15", "SD-17"],
    "REPLACEMENT OF BRIDGES": ["SD-09", "SD-10", "SD-11", "SD-15", "SD-17"],
    "RETROFITTING": ["SD-10", "SD-15", "SD-17"],
    "WIDENING OF PERMANENT BRIDGES": ["SD-10", "SD-15", "SD-17", "SD-19"],
    "FLOOD CONTROL CHECKLIST": ["SD-09", "SD-10", "SD-15", "SD-23", "SD-24", "SD-25", "SD-26", "SD-27", "SD-28", "SD-29"],
    "MAJOR RIVER BASINS": ["SD-09", "SD-10", "SD-15", "SD-20", "SD-23", "SD-24", "SD-25", "SD-26", "SD-27", "SD-28", "SD-29"],
    "KATUPARAN": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "TRIP": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "TOURISM": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "ROLL-IT": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "TIKAS": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-34", "SD-35", "SD-36", "SD-37", "SD-38", "SD-39", "SD-40"],
    "BY-PASS": ["SD-09", "SD-12", "SD-15", "SD-17", "SD-18", "SD-20", "SD-22"],
    "FLYOVERS": ["SD-09", "SD-12", "SD-15", "SD-17", "SD-18", "SD-20", "SD-22"],
    "MISSING LINKS": ["SD-09", "SD-12", "SD-15", "SD-17", "SD-18", "SD-20", "SD-22"],
    "OFF-CARRIAGEWAY": ["SD-12", "SD-15", "SD-17", "SD-18", "SD-19"],
    "PAVING OF UNPAVED": ["SD-10", "SD-12", "SD-15", "SD-19"],
    "ROAD WIDENING": ["SD-07", "SD-10", "SD-12", "SD-15", "SD-17", "SD-18", "SD-19"],
    "MVUC": ["SD-09", "SD-10", "SD-15", "SD-17", "SD-18", "SD-23", "SD-31", "SD-32", "SD-33", "SD-41"],
    "PROBRED": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "SIPAG": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
    "BIP": ["SD-10", "SD-15", "SD-17", "SD-22", "SD-37", "SD-40"],
};

// Map Sub-Program Codes to PAP Keys
export const SUB_PROGRAM_SD_MAP: Record<string, string[]> = {
    "1": PAP_MAPPING["DRAINAGE"],
    "2": PAP_MAPPING["PREVENTIVE MAINTENANCE"],
    "3": PAP_MAPPING["SLOPE COLLAPSE"],
    "4": PAP_MAPPING["DAMAGED PAVED ROADS"],
    "5": PAP_MAPPING["ROAD WIDENING"],
    "6": PAP_MAPPING["PAVING OF UNPAVED"],
    "7": PAP_MAPPING["OFF-CARRIAGEWAY"],
    "8": PAP_MAPPING["BY-PASS"],
    "9": PAP_MAPPING["FLYOVERS"],
    "10": PAP_MAPPING["MISSING LINKS"],
    "11": PAP_MAPPING["NEW BRIDGES"],
    "12": PAP_MAPPING["REPAIR OF PERMANENT BRIDGES"],
    "13": PAP_MAPPING["REPLACEMENT OF BRIDGES"],
    "14": PAP_MAPPING["REPLACEMENT OF BRIDGES"],
    "15": PAP_MAPPING["RETROFITTING"],
    "16": PAP_MAPPING["WIDENING OF PERMANENT BRIDGES"],
    "22": PAP_MAPPING["MAJOR RIVER BASINS"],
    "26": PAP_MAPPING["KATUPARAN"],
    "27": PAP_MAPPING["TRIP"],
    "28": PAP_MAPPING["KATUPARAN"],
    "29": PAP_MAPPING["ROLL-IT"],
    "30": PAP_MAPPING["TIKAS"],
    "48": PAP_MAPPING["FLOOD CONTROL CHECKLIST"],
    "49": PAP_MAPPING["PROBRED"],
    "50": PAP_MAPPING["KATUPARAN"],
    "118": PAP_MAPPING["MVUC"]
};

export const DEFAULT_SD_LIST = ['SD-09', 'SD-15', 'SD-23', 'SD-10', 'SD-41'];

export function getRequiredDocs(subProgramCode?: string | number, thrust?: string): { code: string; label: string }[] {
    let codes = DEFAULT_SD_LIST;

    if (subProgramCode) {
        const sCode = String(subProgramCode);
        if (SUB_PROGRAM_SD_MAP[sCode]) {
            return SUB_PROGRAM_SD_MAP[sCode].map(code => ({
                code, label: SUPPORTING_DOC_DESCRIPTIONS[code] || code
            }));
        }
    }

    if (thrust) {
        const tUpper = thrust.toUpperCase();
        for (const key in PAP_MAPPING) {
            if (tUpper.includes(key)) {
                codes = PAP_MAPPING[key];
                break;
            }
        }
    }

    return codes.map(code => ({
        code,
        label: SUPPORTING_DOC_DESCRIPTIONS[code] || code
    }));
}
