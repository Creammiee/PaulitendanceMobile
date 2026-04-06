export type UserRole = 'admin' | 'student' | 'parent' | 'teacher' | null;

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    fullName: string;
    createdAt: Date;
    status?: 'pending' | 'active' | 'rejected';
    deviceToken?: string | null;
    // Relationships
    studentIds?: string[]; // For parents and teachers (assigned students)
    parentId?: string; // For students
    teacherId?: string; // For students
    section?: string; // For students and teachers
    bindingKey?: string; // For students (unique key for parents to link)
    profilePicture?: string; // URL or Base64 for the avatar
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Attendance {
    id: string;
    studentId: string;
    date: string; // ISO Date string YYYY-MM-DD
    status: AttendanceStatus;
    timeIn?: string; // ISO Timestamp
    markedBy: 'system' | 'teacher';
}

export type LetterType = 'excuse' | 'promissory';
export type LetterStatus = 'pending' | 'approved' | 'rejected';

export interface Letter {
    id: string;
    type: LetterType;
    studentId: string;
    date: string; // The date the letter applies to
    reason: string;
    status: LetterStatus;
    parentApproved?: boolean; // For promissory notes
    teacherApproved?: boolean; // For both
    createdAt: string;
}

export interface SchoolSettings {
    schoolName: string;
    schoolLocation: {
        latitude: number;
        longitude: number;
        radius: number; // in meters
    };
    schoolStartTime: string; // e.g., "08:00"
    schoolDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}
