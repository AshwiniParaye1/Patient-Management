// types/sheet.ts

export interface Sheet {
  id: number;
  title: string;
}

export interface NewPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  location: string;
  age: string;
  phone: string;
  address: string;
  email: string;
  prescription: string;
  dose: string;
  visitDate: string;
  nextVisit: string;
  physicianId: string;
  physicianName: string;
  physicianPhone: string;
  bill: string;
}
