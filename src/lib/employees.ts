export interface Employee {
    id: string;
    username?: string;
    email?: string;
    name: string;
    position: string;
    unit: string;
    user_type: 'Admin' | 'User';
    restrictions: string[]; // e.g. ['RBP Encoding', 'Tech. Review', 'Final Approval']
    password?: string; // Optional for manual assignment
}

export const EMPLOYEES: Employee[] = [
    {
        id: 'emp-01',
        name: 'Engr. Antonio Reyes',
        position: 'Section Chief',
        unit: 'Planning & Design',
        user_type: 'Admin',
        restrictions: ['RBP Encoding', 'Tech. Review', 'Final Approval']
    },
    {
        id: 'emp-02',
        name: 'Engr. Maria Santos',
        position: 'Unit Head',
        unit: 'Design',
        user_type: 'User',
        restrictions: ['Tech. Review']
    },
    {
        id: 'emp-03',
        name: 'Engr. Juan Dela Cruz',
        position: 'Engineer II',
        unit: 'Planning',
        user_type: 'User',
        restrictions: ['RBP Encoding', 'Master List Management']
    },
    {
        id: 'emp-04',
        name: 'Engr. Sarah Lee',
        position: 'Engineer I',
        unit: 'Design',
        user_type: 'User',
        restrictions: ['Document Preparation']
    },
    {
        id: 'emp-05',
        name: 'Estimator Johnson',
        position: 'Cost Estimator',
        unit: 'Estimating',
        user_type: 'User',
        restrictions: ['DUPA Preparation']
    },
    {
        id: 'emp-06',
        name: 'Designer Gomez',
        position: 'Lead Designer',
        unit: 'Design',
        user_type: 'User',
        restrictions: ['Plan Preparation']
    },
    {
        id: 'emp-07',
        name: 'Programmer Reyes',
        position: 'Project Programmer',
        unit: 'Planning',
        user_type: 'User',
        restrictions: ['Scheduling']
    },
    {
        id: 'emp-08',
        name: 'James Rodriguez',
        position: 'Planning Unit',
        unit: 'Planning',
        user_type: 'User',
        restrictions: ['RBP Encoding', 'Global Task Management']
    },
];
