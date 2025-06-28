"use client"

import { useState, useEffect } from "react"
import { FileCheck, FileText, Loader2, Upload } from "lucide-react"
// Add this at the top of your component after the imports
import "../scrollbar-hide.css"

export default function GeneratePurchaseOrder() {
  // States
  const [indents, setIndents] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [haveToPO, setHaveToPO] = useState("")
  const [indentSearch, setIndentSearch] = useState("")
  const [poSearch, setPoSearch] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    indentId: "",
    quantity: "",
    rate: "",
    leadTimeToLift: "",
    totalQty: "",
    totalAmount: "",
    advanceToBePaid: "",
    toBePaidAmount: "",
    whenToBePaid: "",
    notes: "",
    poFile: null,
  })

  // Form errors
  const [errors, setErrors] = useState({})

  // Google Sheet Details
  const sheetId = "16RE9_B2BReWXp1V3AUR0cy9804Liy9OCVzxx07hb0Lo"
  const sheetName = "INDENT-PO"
  // const googleDriveFolderId = "1AJN168FQbmoDFzSO0sh8VikdA3v_5i4e"

  // Data starts from row 7 in the sheet
  const dataStartRow = 7

  // Form validation
  const validateForm = () => {
    const newErrors = {}

    if (haveToPO === "yes") {
      if (!formData.rate) newErrors.rate = "Rate is required"
      if (!formData.leadTimeToLift) newErrors.leadTimeToLift = "Lead Time is required"
      if (!formData.advanceToBePaid) newErrors.advanceToBePaid = "Advance amount is required"

      // Only validate these fields if advanceToBePaid is "yes"
      if (formData.advanceToBePaid === "yes") {
        if (!formData.toBePaidAmount) newErrors.toBePaidAmount = "To be paid amount is required"
        if (!formData.whenToBePaid) newErrors.whenToBePaid = "Payment schedule is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  useEffect(() => {
    const fetchIndentsData = async () => {
      try {
        setLoading(true)
        console.log("Starting to fetch indents data...")

        // Create URL to fetch the sheet in JSON format (this works for public sheets)
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
        console.log("Fetching from URL:", url)

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }

        // Extract the JSON part from the response (Google returns a specific format)
        const text = await response.text()
        // The response is like: google.visualization.Query.setResponse({...})
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")

        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid response format from Google Sheets")
        }

        const jsonString = text.substring(jsonStart, jsonEnd + 1)
        const data = JSON.parse(jsonString)

        // Check if we have valid data
        if (!data.table || !data.table.cols || !data.table.rows) {
          throw new Error("Sheet data is not in the expected format")
        }

        // Extract headers from cols
        const headers = data.table.cols
          .map((col, index) => ({
            id: `col${index}`,
            label: col.label || col.id || `Column ${index + 1}`,
            type: col.type,
          }))
          .filter((header) => header.label) // Filter out empty headers

        console.log("Extracted headers:", headers)

        // Process the rows to extract indent data
        const rowsData = data.table.rows
          .filter((row) => row.c && row.c.length) // Filter out empty rows
          .map((row, rowIndex) => {
            const rowData = {}

            // Add an internal unique ID and row index for updates
            rowData._id = Math.random().toString(36).substring(2, 15)

            // Calculate the actual row index in the sheet
            // Add dataStartRow because data starts from row 7 (1-indexed)
            rowData._rowIndex = rowIndex + dataStartRow

            // Process each cell in the row
            row.c.forEach((cell, cellIndex) => {
              if (cellIndex < headers.length) {
                const header = headers[cellIndex]
                const value = cell && cell.v !== undefined ? cell.v : ""
                rowData[header.id] = value

                // Store formatted value if available (for dates, etc.)
                if (cell && cell.f) {
                  rowData[`${header.id}_formatted`] = cell.f
                }
              }
            })

            return rowData
          })

        console.log("Processed row data:", rowsData)

        // Map columns based on requirements and filter based on conditions
        // Column 'Q' (Planned2) = Not Null and Column "R"(Actual2) = Null
        // Q is col16 (index 16) and R is col17 (index 17)
        const processedIndents = rowsData
          .filter((row) => row.col16 && !row.col17) // Filter based on Q not null and R null
          .map((row) => {
            return {
              ...row, // Keep original data for reference
              id: row.col1 || "", // Column B for Indent ID
              vendorName: row.col3 || "", // Column D for Vendor
              rawMaterialName: row.col4 || "", // Column E for Material
              quantity: row.col13 || "", // Column N for Quantity
            }
          })

        console.log("Setting filtered indents:", processedIndents)
        setIndents(processedIndents)

        // Get completed purchase orders
        // Column "Q"(Planned2) is 'Not Null' and Column "R"(Actual2) is also Not Null
        const completedPOs = rowsData
          .filter((row) => row.col16 && row.col17) // Filter based on Q not null and R not null
          .map((row) => {
            return {
              indentId: row.col1 || "", // Column B for Indent ID
              vendorName: row.col3 || "", // Column D for Vendor
              rawMaterialName: row.col4 || "", // Column E for Material
              quantity: row.col13 || "", // Column N for Quantity
              totalAmount: row.col23 || "0", // Column X for Total Amount
              poFile: row.col24 || "", // Column Y for PO PDF
              status: "completed",
              createdAt: row.col17_formatted || "", // Column R for timestamp
            }
          })

        setPurchaseOrders(completedPOs)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching indents data:", error)
        setError("Failed to load indent data: " + error.message)
        setLoading(false)
      }
    }

    fetchIndentsData()
  }, [sheetId, sheetName])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Calculate total amount when rate or quantity changes
    if (name === "rate" || name === "quantity") {
      const rate = name === "rate" ? Number.parseFloat(value) || 0 : Number.parseFloat(formData.rate) || 0
      const quantity = name === "quantity" ? Number.parseFloat(value) || 0 : Number.parseFloat(formData.quantity) || 0

      if (rate && quantity) {
        setFormData((prev) => ({
          ...prev,
          totalAmount: (rate * quantity).toString(),
        }))
      }
    }
  }

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        poFile: file,
      })
    }
  }

  // Function to upload file to Google Drive and get the link
  const uploadFileToDrive = async (file) => {
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = (error) => reject(error)
      })

      // Create the request to upload the file to Google Drive via Apps Script
      const apiUrl =
        "https://script.google.com/macros/s/AKfycbzlUxEQNUf-bwthQLjzcvm0gMsJUx5hAK8B-Enn9O3kpIy1oLhWSrbc9tThiAI7iCnLZA/exec"

      const formData = new FormData()
      formData.append("action", "uploadFile")
      formData.append("fileName", file.name)
      formData.append("mimeType", file.type)
      formData.append("base64Data", base64Data)
      formData.append("folderId", "1AJN168FQbmoDFzSO0sh8VikdA3v_5i4e")

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Failed to upload file")
      }

      // Return the file URL
      return result.fileUrl
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error)
      throw error
    }
  }

  // Function to update the Google Sheet
  const updateGoogleSheet = async (data, haveToPO) => {
    try {
      // Find the selected indent in the indents array to get the row index
      if (!selectedIndent || !selectedIndent._rowIndex) {
        throw new Error("Selected indent or row index not found")
      }

      const rowIndex = selectedIndent._rowIndex

      // Create a timestamp in DD/MM/YYYY hh:mm:ss format
      const now = new Date()
      const timestamp = now
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")

      // Create an array with the values to update in the sheet
      // The array indices correspond to the column positions
      // We'll use empty strings for columns we don't want to update
      const rowData = Array(30).fill("") // Create an array with enough elements

      // Column R (index 17) - Actual2(timestamp)
      rowData[17] = timestamp

      // Column T (index 19) - Have To Make PO
      rowData[19] = haveToPO

      // If haveToPO is "yes", update additional columns
      if (haveToPO === "yes") {
        // Column U (index 20) - Rate
        rowData[20] = data.rate

        // Column V (index 21) - Lead Time To Lift (Days)
        rowData[21] = data.leadTimeToLift

        // Column W (index 22) - Total Quantity
        rowData[22] = data.totalQty

        // Column X (index 23) - Total Amount
        rowData[23] = data.totalAmount

        // Column Y (index 24) - Upload PO Copy
        if (data.poFileUrl) {
          rowData[24] = data.poFileUrl
        }

        // Column Z (index 25) - Advance To Be Paid
        rowData[25] = data.advanceToBePaid

        // Only include these fields if advanceToBePaid is "yes"
        if (data.advanceToBePaid === "yes") {
          // Column AA (index 26) - To Be Paid Amount
          rowData[26] = data.toBePaidAmount

          // Column AB (index 27) - When To Be Paid
          rowData[27] = data.whenToBePaid
        }

        // Column AC (index 28) - Notes
        rowData[28] = data.notes
      }

      // Create the request to update the Google Sheet
      const apiUrl =
        "https://script.google.com/macros/s/AKfycbzlUxEQNUf-bwthQLjzcvm0gMsJUx5hAK8B-Enn9O3kpIy1oLhWSrbc9tThiAI7iCnLZA/exec"

      const requestData = {
        action: "update",
        sheetName: sheetName,
        rowIndex: rowIndex,
        rowData: JSON.stringify(rowData),
      }

      // Convert the request data to URL parameters
      const params = new URLSearchParams()
      for (const key in requestData) {
        params.append(key, requestData[key])
      }

      // Make the API request
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      })

      if (!response.ok) {
        throw new Error(`Failed to update sheet: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Failed to update sheet")
      }

      return result
    } catch (error) {
      console.error("Error updating Google Sheet:", error)
      throw error
    }
  }

  // Handle Have To Make PO dropdown change
  const handleHaveToPOChange = (e) => {
    setHaveToPO(e.target.value)
  }

  // Update the handleIndentSelect function to also open the modal
  const handleIndentSelect = (indent) => {
    setSelectedIndent(indent)
    setFormData({
      ...formData,
      indentId: indent.id,
      quantity: indent.quantity,
      totalQty: indent.quantity,
    })
    setHaveToPO("") // Reset the dropdown selection
    setIsModalOpen(true)
  }

  // Add a function to close the modal
  const closeModal = () => {
    setIsModalOpen(false)
    setHaveToPO("") // Reset the dropdown selection
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form if haveToPO is "yes"
    if (haveToPO === "yes" && !validateForm()) return
    if (!selectedIndent) return

    setIsSubmitting(true)

    try {
      // Handle file upload if there is a file and haveToPO is "yes"
      let fileUrl = ""
      if (haveToPO === "yes" && formData.poFile) {
        // Upload the file to Google Drive and get the URL
        fileUrl = await uploadFileToDrive(formData.poFile)
      }

      // Update the Google Sheet
      await updateGoogleSheet(
        {
          ...formData,
          poFileUrl: fileUrl,
        },
        haveToPO,
      )

      // Generate current timestamp in DD/MM/YYYY hh:mm:ss format
      const now = new Date()
      const timestamp = now
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")

      // Create a new PO object to add to the UI
      const newPO = {
        indentId: formData.indentId,
        vendorName: selectedIndent.vendorName,
        rawMaterialName: selectedIndent.rawMaterialName,
        quantity: formData.quantity,
        rate: haveToPO === "yes" ? formData.rate : "",
        leadTimeToLift: haveToPO === "yes" ? formData.leadTimeToLift : "",
        totalQty: haveToPO === "yes" ? formData.totalQty : "",
        totalAmount: haveToPO === "yes" ? formData.totalAmount : "",
        advanceToBePaid: haveToPO === "yes" ? formData.advanceToBePaid : "",
        toBePaidAmount: haveToPO === "yes" ? formData.toBePaidAmount : "",
        whenToBePaid: haveToPO === "yes" ? formData.whenToBePaid : "",
        notes: haveToPO === "yes" ? formData.notes : "",
        poFile: fileUrl,
        status: "completed",
        createdAt: timestamp,
      }

      setPurchaseOrders([...purchaseOrders, newPO])

      // Remove the processed indent from the indents list
      setIndents(indents.filter((indent) => indent.id !== selectedIndent.id))

      // Reset form and selected indent
      setFormData({
        indentId: "",
        quantity: "",
        rate: "",
        leadTimeToLift: "",
        totalQty: "",
        totalAmount: "",
        advanceToBePaid: "",
        toBePaidAmount: "",
        whenToBePaid: "",
        notes: "",
        poFile: null,
      })
      setSelectedIndent(null)
      setIsSubmitting(false)
      setIsModalOpen(false) // Close the modal
      setHaveToPO("") // Reset the dropdown selection

      // Show success notification
      alert(`Purchase Order for ${newPO.indentId} has been created successfully`)
    } catch (error) {
      console.error("Error submitting form:", error)
      setIsSubmitting(false)
      alert(`Error: ${error.message}`)
    }
  }

  // Filter indents based on search term
  const filteredIndents = indents.filter(
    (indent) =>
      indent.id.toLowerCase().includes(indentSearch.toLowerCase()) ||
      indent.vendorName.toLowerCase().includes(indentSearch.toLowerCase()) ||
      indent.rawMaterialName.toLowerCase().includes(indentSearch.toLowerCase()),
  )

  // Filter purchase orders based on search term
  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.indentId.toLowerCase().includes(poSearch.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(poSearch.toLowerCase()) ||
      po.rawMaterialName.toLowerCase().includes(poSearch.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 3: Generate Purchase Order</h2>
              <p className="text-sm text-gray-500">Create purchase orders for approved indents</p>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6">
          {/* Approved Indents Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 sticky top-0 z-10 flex justify-between items-center">
              <h3 className="font-medium text-gray-900 flex items-center">
                <FileCheck className="h-5 w-5 text-blue-600 mr-2" />
                Approved Indents
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={indentSearch}
                  onChange={(e) => setIndentSearch(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-md"
                />
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-red-200 rounded-lg">
                  <FileText className="h-10 w-10 text-red-300 mb-2" />
                  <p className="text-gray-500 text-center">{error}</p>
                </div>
              ) : indents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-blue-200 rounded-lg">
                  <FileText className="h-10 w-10 text-blue-300 mb-2" />
                  <p className="text-gray-500 text-center">No approved indents found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[300px] scrollbar-hide">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Indent ID
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Vendor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Material
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Quantity
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredIndents.length === 0 && indentSearch !== "" ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No results found for "{indentSearch}"
                          </td>
                        </tr>
                      ) : (
                        filteredIndents.map((indent) => (
                          <tr key={indent._id} className="hover:bg-blue-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                              {indent.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{indent.vendorName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {indent.rawMaterialName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{indent.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleIndentSelect(indent)}
                                className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200"
                              >
                                Generate PO
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Purchase Orders Table */}
      {purchaseOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 sticky top-0 z-10 flex justify-between items-center">
            <h3 className="font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              Recent Purchase Orders
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-200 rounded-md"
              />
            </div>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[300px] scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Indent ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Vendor
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Material
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Quantity
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      PO PDF
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPOs.length === 0 && poSearch !== "" ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No results found for "{poSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po, index) => (
                      <tr key={index} className="hover:bg-blue-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{po.indentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{po.vendorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{po.rawMaterialName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{po.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                          {po.totalAmount ? `₹${po.totalAmount}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {po.poFile && (
                            <a
                              href={po.poFile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 inline-flex items-center"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              View PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Purchase Order Form */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 sticky top-0 z-10 flex justify-between items-center">
              <h3 className="font-medium text-gray-900">
                {selectedIndent
                  ? `Creating PO for ${selectedIndent.id} (${selectedIndent.vendorName}) - ${selectedIndent.rawMaterialName}`
                  : "Purchase Order Details"}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Have To Make PO Dropdown */}
              <div className="mb-6">
                <select
                  id="haveToPO"
                  value={haveToPO}
                  onChange={handleHaveToPOChange}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Show form based on haveToPO selection */}
              {haveToPO === "yes" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Quantity */}
                    <div>
                      <input
                        type="text"
                        id="quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                        placeholder="Quantity"
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <input
                        type="text"
                        id="rate"
                        name="rate"
                        value={formData.rate}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${
                          errors.rate ? "border-red-300" : "border-blue-200"
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Rate"
                      />
                      {errors.rate && <p className="mt-1 text-sm text-red-600">{errors.rate}</p>}
                    </div>

                    {/* Lead Time */}
                    <div>
                      <input
                        type="text"
                        id="leadTimeToLift"
                        name="leadTimeToLift"
                        value={formData.leadTimeToLift}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${
                          errors.leadTimeToLift ? "border-red-300" : "border-blue-200"
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Lead Time To Lift (Days)"
                      />
                      {errors.leadTimeToLift && <p className="mt-1 text-sm text-red-600">{errors.leadTimeToLift}</p>}
                    </div>

                    {/* Total Quantity */}
                    <div>
                      <input
                        type="text"
                        id="totalQty"
                        name="totalQty"
                        value={formData.totalQty}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                        placeholder="Total Quantity"
                      />
                    </div>

                    {/* Total Amount */}
                    <div>
                      <input
                        type="text"
                        id="totalAmount"
                        name="totalAmount"
                        value={formData.totalAmount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                        placeholder="Total Amount"
                      />
                    </div>

                    {/* Upload PO Copy */}
                    <div>
                      <div className="flex items-center justify-center h-10 border border-dashed border-blue-200 rounded-md bg-blue-50 cursor-pointer hover:bg-blue-100 relative">
                        <input
                          type="file"
                          id="poFile"
                          name="poFile"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Upload className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-600">
                          {formData.poFile ? formData.poFile.name : "Upload PO Copy"}
                        </span>
                      </div>
                    </div>

                    {/* Advance To Be Paid */}
                    <div>
                      <select
                        id="advanceToBePaid"
                        name="advanceToBePaid"
                        value={formData.advanceToBePaid}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${
                          errors.advanceToBePaid ? "border-red-300" : "border-blue-200"
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Advance To Be Paid"
                      >
                        <option value="">Select an option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                      {errors.advanceToBePaid && <p className="mt-1 text-sm text-red-600">{errors.advanceToBePaid}</p>}
                    </div>

                    {/* To Be Paid Amount - Only show if advanceToBePaid is "yes" */}
                    {formData.advanceToBePaid === "yes" && (
                      <div>
                        <input
                          type="text"
                          id="toBePaidAmount"
                          name="toBePaidAmount"
                          value={formData.toBePaidAmount}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${
                            errors.toBePaidAmount ? "border-red-300" : "border-blue-200"
                          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          placeholder="To Be Paid Amount"
                        />
                        {errors.toBePaidAmount && <p className="mt-1 text-sm text-red-600">{errors.toBePaidAmount}</p>}
                      </div>
                    )}

                    {/* When To Be Paid - Only show if advanceToBePaid is "yes" */}
                    {formData.advanceToBePaid === "yes" && (
                      <div>
                        <input
                          type="date"
                          id="whenToBePaid"
                          name="whenToBePaid"
                          value={formData.whenToBePaid}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${
                            errors.whenToBePaid ? "border-red-300" : "border-blue-200"
                          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {errors.whenToBePaid && <p className="mt-1 text-sm text-red-600">{errors.whenToBePaid}</p>}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Notes"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </div>
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Show only submit button when "No" is selected */}
              {haveToPO === "no" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </div>
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}