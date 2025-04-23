// app/components/AddPatientDialog.tsx

import { formatDate, generateId } from "@/lib/utils";
import { NewPatient } from "@/types/sheet";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";
import React from "react";
import { addDataToSheet } from "../file/[id]/googleSheetsApi";

interface AddPatientDialogProps {
  open: boolean;
  onClose: () => void;
  newPatient: NewPatient;
  onNewPatientChange: (field: keyof NewPatient, value: string) => void;
  setNotification: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >;
  accessToken: string | undefined;
  fileId: string | undefined;
  handleRefresh: () => Promise<void>;
}

const AddPatientDialog: React.FC<AddPatientDialogProps> = ({
  open,
  onClose,
  newPatient,
  onNewPatientChange,
  setNotification,
  accessToken,
  fileId,
  handleRefresh
}) => {
  const handleAddPatient = async () => {
    if (!fileId || !accessToken) return;

    try {
      // Generate IDs
      const patientId =
        newPatient.patientId === "Auto Generate"
          ? `a12kj${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, "0")}`
          : newPatient.patientId;
      const appointmentId = generateId("ap");

      // 1. Add to patient sheet
      const patientData = [
        patientId, // ssn
        newPatient.firstName, // first_name
        newPatient.lastName, // last_name
        newPatient.address, // address
        newPatient.location, // location
        "", // email
        newPatient.phone, // phone
        "" // pcp
      ];
      await addDataToSheet(accessToken, fileId, "patient", patientData);

      // 2. Add to appointment sheet
      const appointmentData = [
        appointmentId, // appointmentID
        patientId, // patientID
        newPatient.physicianId, // physicianID
        formatDate(newPatient.visitDate), // start_dt_time
        formatDate(newPatient.nextVisit) // next_dt_time
      ];
      await addDataToSheet(accessToken, fileId, "appointment", appointmentData);

      // 3. Add to prescribes sheet
      const prescribesData = [
        newPatient.physicianId, // physician
        patientId, // PatientID
        newPatient.prescription, // description
        newPatient.dose // dose
      ];
      await addDataToSheet(accessToken, fileId, "prescribes", prescribesData);

      // 4. Add to physician sheet if new physician
      if (newPatient.physicianId && newPatient.physicianName) {
        const [physicianFirstName = "", physicianLastName = ""] =
          newPatient.physicianName.split(" ");
        const physicianData = [
          newPatient.physicianId, // employeeid
          `${physicianFirstName} ${physicianLastName}`, // name
          "Sr Doctor", // position
          newPatient.physicianPhone // phone
        ];
        await addDataToSheet(accessToken, fileId, "physician", physicianData);
      }

      setNotification({
        open: true,
        message: "Patient and related data added successfully",
        type: "success"
      });

      // Refresh the data
      await handleRefresh();
      onClose();
    } catch (error: any) {
      console.error("Error adding patient data:", error);
      setNotification({
        open: true,
        message: `Failed to add patient data: ${error.message}`,
        type: "error"
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div" fontWeight="bold">
          Add Patient
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* First row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Patient ID
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.patientId}
                onChange={(e) =>
                  onNewPatientChange("patientId", e.target.value)
                }
                disabled={newPatient.patientId === "Auto Generate"}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Patient First Name
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.firstName}
                onChange={(e) =>
                  onNewPatientChange("firstName", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Patient Last Name
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.lastName}
                onChange={(e) => onNewPatientChange("lastName", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Location
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.location}
                onChange={(e) => onNewPatientChange("location", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>

          {/* Second row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Age
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.age}
                onChange={(e) => onNewPatientChange("age", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Phone
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.phone}
                onChange={(e) => onNewPatientChange("phone", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Address
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.address}
                onChange={(e) => onNewPatientChange("address", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>

          <Box sx={{ height: "1px", bgcolor: "#e0e0e0", my: 3 }} />

          {/* Third row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Prescription
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.prescription}
                onChange={(e) =>
                  onNewPatientChange("prescription", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Dose
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.dose}
                onChange={(e) => onNewPatientChange("dose", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>

          {/* Fourth row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Visit Date
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="date"
                value={newPatient.visitDate}
                onChange={(e) =>
                  onNewPatientChange("visitDate", e.target.value)
                }
                InputLabelProps={{
                  shrink: true
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Next Visit
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="date"
                value={newPatient.nextVisit}
                onChange={(e) =>
                  onNewPatientChange("nextVisit", e.target.value)
                }
                InputLabelProps={{
                  shrink: true
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>

          <Box sx={{ height: "1px", bgcolor: "#e0e0e0", my: 3 }} />

          {/* Fifth row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Physician ID
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.physicianId}
                onChange={(e) =>
                  onNewPatientChange("physicianId", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Physician Name (First, Last Name)
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.physicianName}
                onChange={(e) =>
                  onNewPatientChange("physicianName", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>

          {/* Sixth row */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Phone
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.physicianPhone}
                onChange={(e) =>
                  onNewPatientChange("physicianPhone", e.target.value)
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Bill
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={newPatient.bill}
                onChange={(e) => onNewPatientChange("bill", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px"
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAddPatient} variant="contained" color="primary">
          Add Patient
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPatientDialog;
