export type TaskType = 'PROJECT_LEAD' | 'DOC_COMPLIANCE';

export interface ProjectTask {
    id: string;
    project_id: string;
    assignee_name: string | null;
    task_type: TaskType;
    doc_code: string | null;
    status: string;
    deadline: string | null;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    alternate_id: string;
    project_name: string;
    project_amount: number;
    city_municipality: string;
    status: string;
    sub_program_code: string;
    thrust: string;
    deadline: string;
    created_at: string;
    // Assignments will now be fetched from tasks table
    tasks?: ProjectTask[];
}
