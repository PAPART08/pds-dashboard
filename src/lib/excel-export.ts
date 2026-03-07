import * as XLSX from 'xlsx';

export const exportProjectsToExcel = (projects: any[]) => {
    const wb = XLSX.utils.book_new();

    // 1. Project Data
    const projectData = projects.map(p => ({
        "Project IDs": p.alternateId || p.id,
        "Project Name": p.projectDescription,
        "Amount": p.projectAmount || p.totalCost,
        "UACS": "",
        "Project Category ": p.category,
        "Thrust": p.thrust || "",
        "Project Origin": p.projectOrigin || "",
        "Project Notes": p.justification || "",
        "NPV/C": "",
        "Funding Agreement Name": p.fundingAgreementName || "",
        "Implementing Office": p.io || "",
        "City / Municipality": p.municipality,
        "District Engineering Office": p.deo || "",
        "Legislative District": p.ld || "",
        "Operating Unit": p.ou || "",
        "Originating Agency": p.originatingAgency || "",
        "Planned Start Date": "",
        "Planned End Date": "",
        "Alternative Project Code": p.alternateId || "",
        "Component Type": p.components?.[0]?.compType || "",
        "Component ID": p.components?.[0]?.id || "",
        "Component Name": p.components?.[0]?.infraName || "",
        "Region Wide": p.isRegionwide ? "Yes" : "No",
        "Start Year": p.fiscalYear || new Date(p.createdAt || Date.now()).getFullYear().toString(),
        " Amount 2 ": p.asd1 || "",
        " Amount 3 ": p.asd2 || "",
        " Amount 4 ": p.asd3 || "",
        " Amount 5 ": p.asd4 || "",
        " Amount 6 ": p.asd5 || "",
        " Amount 7 ": p.asd6 || "",
        " Amount 8 ": p.asd7 || "",
        " Amount 9 ": p.asd8 || "",
        " Amount 10 ": p.asd9 || "",
        "Reporting Region": p.region || "",
        "RDP Results Matrices Indicators Addressed": p.asd10 || "",
        "Basis for Implementation": p.asd11 || "",
        "Status/Level of Readiness": p.programStage || "",
        "NEDA Project Status": "",
        "Rank": p.priorityRank || "",
        "Tier": p.priorityTier || ""
    }));
    const ws1 = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, ws1, "Project Data");

    // 2. Major Items of Work
    const itemsOfWork: any[] = [];
    projects.forEach(p => {
        if (p.specificDetails) {
            p.specificDetails.forEach((d: any) => {
                itemsOfWork.push({
                    "Project IDs": p.alternateId || p.id,
                    "Infrastructure Type": p.components?.find((c: any) => c.id === d.compId)?.infraType || d.infraType || "",
                    "Infrastructure Item": d.infraId || d.infra_item || "",
                    "Start Chainage": d.startChainage || d.start_chainage || "",
                    "End Chainage": d.endChainage || d.end_chainage || "",
                    "Length": d.length || d.length_m || 0,
                    "Type of work": d.scope || d.scope_of_work || "",
                    "Target Unit": p.components?.find((c: any) => c.id === d.compId)?.unit || "",
                    "Target Amount": d.target || d.target_amount || 0,
                    "Dominant": d.dominant ? "Yes" : "No",
                    "Start X": d.startX || "",
                    "Start Y": d.startY || "",
                    "End X": d.endX || "",
                    "End Y": d.endY || "",
                    "Component ID": d.compId || d.comp_id_ref || "",
                    "Detailed Scope of Work": d.scope || d.scope_of_work || d.detailed_scope_of_work || "",
                    "Start Station Limit": d.startLimit || d.start_limit || "",
                    "End Station Limit": d.endLimit || d.end_limit || "",
                    "Year": p.fiscalYear || new Date(p.createdAt || Date.now()).getFullYear().toString(),
                    "Area (sq.m.) of Application": "",
                    "Y": "",
                    "Z": "",
                    "Cost per Line": d.cost || d.cost_per_line || 0
                });
            });
        }
    });

    if (itemsOfWork.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(itemsOfWork);
        XLSX.utils.book_append_sheet(wb, ws2, "Major Items of Work");
    }

    XLSX.writeFile(wb, `MYPS_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToExcel = (formData: any, components: any[], specificDetails: any[]) => {
    exportProjectsToExcel([{ ...formData, components, specificDetails }]);
};
