"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function IndentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    indenterName: "",
    materialName: "",
    brokerName: "",
    qty: "",
    remarks: "",
    location: "",
    division: "",
  });
  const [errors, setErrors] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({
    indenterName: [],
    materialName: [],
    division: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastIndentNumberNumeric, setLastIndentNumberNumeric] = useState(0);

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec";
  const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg";
  const MASTER_SHEET_NAME = "MASTER";
  const SHEET_NAME = "INDENT";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const masterUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${MASTER_SHEET_NAME}&cb=${new Date().getTime()}`;
      const indentUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&cb=${new Date().getTime()}`;

      const masterResponse = await fetch(masterUrl);
      if (!masterResponse.ok) throw new Error(`Failed to fetch Master sheet: ${masterResponse.status} ${masterResponse.statusText}`);
      const masterCsvData = await masterResponse.text();
      const masterRows = masterCsvData.split("\n").map((row) =>
        row.split(",").map(
          (cell) => cell.trim().replace(/^"|"$/g, ""),
        ),
      );

      // Extract unique values from columns A, B, C
      const extractUniqueValues = (rows, columnIndex) => {
        if (columnIndex === -1 || !rows || rows.length <= 1) return [];
        const values = rows
          .slice(1)
          .map((row) => (columnIndex < row.length ? row[columnIndex] : ""))
          .filter((value) => value && value.trim() !== "");
        return [...new Set(values)].sort();
      };

      const options = {
        indenterName: extractUniqueValues(masterRows, 0), // Column A
        materialName: extractUniqueValues(masterRows, 1), // Column B
        division: extractUniqueValues(masterRows, 2),     // Column C
      };
      setDropdownOptions(options);

      // Fetch INDENT sheet to get the last indent number
      const indentResponse = await fetch(indentUrl);
      if (!indentResponse.ok) throw new Error(`Failed to fetch Indent sheet: ${indentResponse.status} ${indentResponse.statusText}`);
      const indentCsvData = await indentResponse.text();

      const indentRows = indentCsvData.split("\n").map((row) => {
        return row.split(",").map(
          (cell) => cell.trim().replace(/^"|"$/g, "")
        );
      });

      // Find the highest IN- number from column B
      const indentNumberColumnIndex = 1;
      let highestNumber = 0;
      if (indentRows.length > 1) {
        for (let i = 1; i < indentRows.length; i++) {
          if (indentRows[i] && indentRows[i].length > indentNumberColumnIndex) {
            const idValue = indentRows[i][indentNumberColumnIndex];
            if (idValue && typeof idValue === 'string' && idValue.startsWith("IN-")) {
              const numStr = idValue.substring(3);
              const num = Number.parseInt(numStr, 10);
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
              }
            }
          }
        }
      }
      setLastIndentNumberNumeric(highestNumber);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load initial form data.", {
        description: "Please try refreshing. Error: " + error.message,
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [SHEET_ID, SHEET_NAME, MASTER_SHEET_NAME]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.indenterName) newErrors.indenterName = "Indenter Name is required.";
    if (!formData.materialName) newErrors.materialName = "Material Name is required.";
    if (!formData.brokerName.trim()) newErrors.brokerName = "Broker Name is required.";
    if (!formData.qty) newErrors.qty = "Quantity is required.";
    else if (isNaN(Number(formData.qty)) || Number(formData.qty) <= 0) newErrors.qty = "Quantity must be a positive number.";
    if (!formData.location.trim()) newErrors.location = "Location is required.";
    if (!formData.division) newErrors.division = "Division is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors).find(key => errors[key]);
      if (firstErrorKey) {
        toast.error("Validation Error", {
          description: errors[firstErrorKey],
          icon: <XCircle className="h-4 w-4" />,
        });
      } else {
        toast.error("Validation Error", {
          description: "Please fill all required fields correctly.",
          icon: <XCircle className="h-4 w-4" />,
        });
      }
      return;
    }
    setIsSubmitting(true);

    try {
      const nextNumericPart = lastIndentNumberNumeric + 1;
      const paddedNumber = nextNumericPart.toString().padStart(3, "0");
      const indentNumber = `IN-${paddedNumber}`;

      // Generate timestamp in DD/MM/YYYY hh:mm:ss format
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // Prepare row data according to INDENT sheet structure
      const rowData = [
        timestamp,              // Column A - Timestamp
        indentNumber,          // Column B - Indent Number
        formData.indenterName, // Column C - Indenter Name
        formData.materialName, // Column D - Material Name
        formData.brokerName,   // Column E - Broker Name
        formData.qty,          // Column F - Qty
        formData.remarks,      // Column G - Remarks
        formData.location,     // Column H - Location
        formData.division      // Column I - Division
      ];

      const formPayload = new FormData();
      formPayload.append("sheetName", SHEET_NAME);
      formPayload.append("action", "insert");
      formPayload.append("rowData", JSON.stringify(rowData));

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formPayload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Submission failed: ${response.status} ${response.statusText}. ${errorText ? `Details: ${errorText}` : 'Server did not provide details.'}`);
      }

      const resultText = await response.text();
      try {
        const result = JSON.parse(resultText);
        if (result.status !== "success" && result.result !== "success" && result.message !== "Row inserted successfully") {
          throw new Error(result.message || "Submission reported an issue by Apps Script (JSON).");
        }
      } catch (jsonError) {
        console.warn("handleSubmit: Apps Script response was not valid JSON. Assuming success based on response.ok if no error thrown yet.", jsonError);
      }

      setLastIndentNumberNumeric(nextNumericPart);

      toast.success("Success!", {
        description: `Indent Number ${indentNumber} generated successfully!`,
        icon: <CheckCircle className="h-4 w-4" />,
      });

      // Reset form
      setFormData({
        indenterName: "",
        materialName: "",
        brokerName: "",
        qty: "",
        remarks: "",
        location: "",
        division: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit Indent. Please try again.",
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="ml-3 text-gray-700 mt-4">Loading form data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6 lg:p-6">
      <Card className="w-full shadow-lg border-none">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <FileText className="h-6 w-6 text-blue-600" />
            Create New Indent
          </CardTitle>
          {/* <CardDescription className="text-gray-600">Fill out the form to generate a new indent with an IN Number</CardDescription> */}
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Indenter Name */}
              <div>
                <Label htmlFor="indenterName">Indenter Name <span className="text-red-500">*</span></Label>
                <Select name="indenterName" value={formData.indenterName} onValueChange={(value) => handleSelectChange("indenterName", value)}>
                  <SelectTrigger className={`mt-1 ${errors.indenterName ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select indenter" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.indenterName.map((option, index) => (
                      <SelectItem key={`indenter-${index}`} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.indenterName && <p className="text-red-500 text-xs mt-1">{errors.indenterName}</p>}
              </div>

              {/* Material Name */}
              <div>
                <Label htmlFor="materialName">Material Name <span className="text-red-500">*</span></Label>
                <Select name="materialName" value={formData.materialName} onValueChange={(value) => handleSelectChange("materialName", value)}>
                  <SelectTrigger className={`mt-1 ${errors.materialName ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.materialName.map((option, index) => (
                      <SelectItem key={`material-${index}`} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.materialName && <p className="text-red-500 text-xs mt-1">{errors.materialName}</p>}
              </div>

              {/* Division */}
              <div>
                <Label htmlFor="division">Division <span className="text-red-500">*</span></Label>
                <Select name="division" value={formData.division} onValueChange={(value) => handleSelectChange("division", value)}>
                  <SelectTrigger className={`mt-1 ${errors.division ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.division.map((option, index) => (
                      <SelectItem key={`division-${index}`} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.division && <p className="text-red-500 text-xs mt-1">{errors.division}</p>}
              </div>

              {/* Broker Name */}
              <div>
                <Label htmlFor="brokerName">Broker Name <span className="text-red-500">*</span></Label>
                <Input
                  id="brokerName"
                  type="text"
                  name="brokerName"
                  placeholder="Enter broker name"
                  value={formData.brokerName}
                  onChange={handleChange}
                  className={`mt-1 ${errors.brokerName ? "border-red-500" : ""}`}
                />
                {errors.brokerName && <p className="text-red-500 text-xs mt-1">{errors.brokerName}</p>}
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="qty">Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="qty"
                  type="number"
                  name="qty"
                  placeholder="Enter quantity"
                  value={formData.qty}
                  onChange={handleChange}
                  min="1"
                  className={`mt-1 ${errors.qty ? "border-red-500" : ""}`}
                />
                {errors.qty && <p className="text-red-500 text-xs mt-1">{errors.qty}</p>}
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
                <Input
                  id="location"
                  type="text"
                  name="location"
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`mt-1 ${errors.location ? "border-red-500" : ""}`}
                />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              </div>

            </div>

            {/* Remarks - Full width */}
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                name="remarks"
                placeholder="Enter any additional remarks or requirements"
                value={formData.remarks}
                onChange={handleChange}
                className={`min-h-[80px] mt-1 ${errors.remarks ? "border-red-500" : ""}`}
              />
              {errors.remarks && <p className="text-red-500 text-xs mt-1">{errors.remarks}</p>}
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Create Indent"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}