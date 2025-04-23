// app/file/[id]/googleSheetsApi.ts

export async function getAvailableSheets(accessToken: string, fileId: string) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
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
    return metadata.sheets.map((sheet: any) => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title
    }));
  } catch (error) {
    console.error("Error fetching Google Sheets metadata:", error);
    throw error;
  }
}

export async function fetchSheetData(
  accessToken: string,
  fileId: string,
  sheetTitle: string
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const dataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${sheetTitle}`,
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
    return data.values;
  } catch (error) {
    console.error("Error fetching Google Sheet data:", error);
    throw error;
  }
}

export async function addDataToSheet(
  accessToken: string,
  fileId: string,
  sheetName: string,
  rowData: string[]
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${sheetName}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add data to ${sheetName} sheet`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error adding data to ${sheetName} sheet:`, error);
    throw error;
  }
}

export async function deleteSheetRow(
  accessToken: string,
  fileId: string,
  sheetTitle: string,
  rowIndex: number
) {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // Get the actual sheet ID from metadata first
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

    // Find the sheet with the matching title
    let sheetId = null;
    for (const sheet of metadata.sheets) {
      if (sheet.properties.title === sheetTitle) {
        sheetId = sheet.properties.sheetId;
        break;
      }
    }

    if (!sheetId) {
      throw new Error(`Could not find sheet with title: ${sheetTitle}`);
    }

    // Google Sheets API requires batch update for row deletion
    const request = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    };

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Google Sheets API error:", errorData);
      throw new Error(`Failed to delete row: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting row from Google Sheet:", error);
    throw error;
  }
}
