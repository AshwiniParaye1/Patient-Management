//app/file/[id]/page.tsx

"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Function to fetch Google Sheets data
async function fetchSheetData(accessToken: string, fileId: string) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // First get spreadsheet metadata to find sheet IDs
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`
      );
    }

    const metadata = await metadataResponse.json();
    console.log("metadata", metadata);
    const firstSheetId = metadata.sheets[2].properties.title;

    // Now get the actual data from the first sheet
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${firstSheetId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!dataResponse.ok) {
      throw new Error(`Failed to get sheet data: ${dataResponse.status}`);
    }

    const data = await dataResponse.json();
    console.log("data", data);
    return data.values;
  } catch (error) {
    console.error("Error fetching Google Sheet data:", error);
    throw error;
  }
}

export default function FilePage() {
  const params = useParams();
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // State for edit functionality
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);

  // State for delete functionality
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null);

  // State for row actions menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    type: "success"
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch the sheet data when session is available
  useEffect(() => {
    async function getSheetData() {
      if (!id) return;
      if (!session?.accessToken) return;
      console.log("id", id);
      try {
        setLoading(true);
        const data = await fetchSheetData(session.accessToken, id.toString());
        setSheetData(data);
        setError(null);
      } catch (err: any) {
        console.error("Error:", err);
        setError(err.message || "Failed to load spreadsheet data");
      } finally {
        setLoading(false);
      }
    }

    if (session?.accessToken) {
      getSheetData();
    }
  }, [session, id]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleRefresh = async () => {
    if (!id || !session?.accessToken) return;
    setRefreshing(true);
    try {
      const data = await fetchSheetData(session.accessToken, id.toString());
      setSheetData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Filter data based on search term
  const filteredData =
    sheetData.length > 1
      ? sheetData
          .slice(1)
          .filter((row) =>
            row.some((cell) =>
              cell.toString().toLowerCase().includes(search.toLowerCase())
            )
          )
      : [];

  // Action menu handlers
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    rowIndex: number
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedRowIndex(rowIndex);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedRowIndex(null);
  };

  // Edit handlers
  const handleEditClick = (rowIndex: number) => {
    setEditRowIndex(rowIndex);
    setEditValues([...filteredData[rowIndex]]);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditRowIndex(null);
  };

  const handleEditInputChange = (index: number, value: string) => {
    const newValues = [...editValues];
    newValues[index] = value;
    setEditValues(newValues);
  };

  const handleEditSave = async () => {
    if (editRowIndex === null || !id || !session?.accessToken) return;

    try {
      // Calculate the actual row index in the sheet (header + 1-based index)
      const actualRowIndex = sheetData.indexOf(filteredData[editRowIndex]) + 1;
      const sheetTitle = sheetData[0][2].properties?.title || "Sheet1"; // Use the first sheet or default

      // Create a range string like "A5:Z5" for the row
      const rangeStart = "A" + (actualRowIndex + 1); // +1 for header row
      const rangeEnd =
        String.fromCharCode(65 + editValues.length - 1) + (actualRowIndex + 1);
      const range = `${rangeStart}:${rangeEnd}`;

      // await updateSheetData(
      //   session.accessToken,
      //   id.toString(),
      //   sheetTitle,
      //   range,
      //   editValues
      // );

      // Update local data
      const newSheetData = [...sheetData];
      newSheetData[actualRowIndex] = editValues;
      setSheetData(newSheetData);

      setNotification({
        open: true,
        message: "Row updated successfully",
        type: "success"
      });

      handleEditDialogClose();
    } catch (error: any) {
      setNotification({
        open: true,
        message: `Failed to update: ${error.message}`,
        type: "error"
      });
    }
  };

  // Delete handlers
  const handleDeleteClick = (rowIndex: number) => {
    setDeleteRowIndex(rowIndex);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteRowIndex(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteRowIndex === null || !id || !session?.accessToken) return;

    try {
      // Calculate the actual row index in the sheet
      const actualRowIndex =
        sheetData.indexOf(filteredData[deleteRowIndex]) + 1;
      const sheetTitle = sheetData[0][2].properties?.title || "Sheet1";

      // Update local data by removing the row
      const newSheetData = [...sheetData];
      newSheetData.splice(actualRowIndex, 1);
      setSheetData(newSheetData);

      setNotification({
        open: true,
        message: "Row deleted successfully",
        type: "success"
      });

      handleDeleteDialogClose();
    } catch (error: any) {
      setNotification({
        open: true,
        message: `Failed to delete: ${error.message}`,
        type: "error"
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (status === "loading" || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading spreadsheet data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => router.push("/drive")}
          sx={{ mt: 2 }}
        >
          Return to Drive
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box
          sx={{
            p: 3,
            borderBottom: "1px solid #eaeaea",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            justifyContent: "space-between"
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            Spreadsheet Data
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              width: { xs: "100%", md: "auto" }
            }}
          >
            <TextField
              placeholder="Search data..."
              size="small"
              variant="outlined"
              value={search}
              onChange={handleSearch}
              sx={{ minWidth: { sm: 250 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                Add Row
              </Button>
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {sheetData.length > 0 ? (
          <>
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid #eaeaea",
                bgcolor: "#f9f9f9"
              }}
            >
              <Chip
                label={`${filteredData.length} ${
                  filteredData.length === 1 ? "row" : "rows"
                }`}
                size="small"
                sx={{ mr: 1 }}
              />
              {search && (
                <Chip
                  label={`Search: "${search}"`}
                  size="small"
                  onDelete={() => setSearch("")}
                />
              )}
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {sheetData[0]?.map((cell, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        {cell}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100"
                        >
                          {cell}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 text-right">
                        <IconButton
                          size="small"
                          aria-label="more"
                          onClick={(e) => handleMenuOpen(e, rowIndex)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* Row actions menu */}
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem
                onClick={() =>
                  selectedRowIndex !== null && handleEditClick(selectedRowIndex)
                }
              >
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                Edit
              </MenuItem>
              <MenuItem
                onClick={() =>
                  selectedRowIndex !== null &&
                  handleDeleteClick(selectedRowIndex)
                }
              >
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            </Menu>

            {/* Edit Dialog */}
            <Dialog
              open={editDialogOpen}
              onClose={handleEditDialogClose}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Row</DialogTitle>
              <DialogContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pt: 1
                  }}
                >
                  {editValues.map((value, index) => (
                    <TextField
                      key={index}
                      label={sheetData[0][index] || `Field ${index + 1}`}
                      value={value}
                      onChange={(e) =>
                        handleEditInputChange(index, e.target.value)
                      }
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleEditDialogClose}>Cancel</Button>
                <Button
                  onClick={handleEditSave}
                  variant="contained"
                  color="primary"
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to delete this row? This action cannot
                  be undone.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDeleteDialogClose}>Cancel</Button>
                <Button onClick={handleDeleteConfirm} color="error">
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

            {/* Empty state handling */}
            {filteredData.length === 0 && search && (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No matching data found. Try a different search term.
                </Typography>
                <Button
                  variant="text"
                  onClick={() => setSearch("")}
                  sx={{ mt: 2 }}
                >
                  Clear Search
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 8, textAlign: "center" }}>
            <Typography color="text.secondary" paragraph>
              No data found in this spreadsheet.
            </Typography>
            <Button variant="outlined" onClick={handleRefresh}>
              Refresh Data
            </Button>
          </Box>
        )}
      </Paper>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        message={notification.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
}
