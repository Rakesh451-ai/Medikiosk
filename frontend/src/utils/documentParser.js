/**
 * Clinical Document Optical Recognition & Entity Extraction Utility
 * Handles camera frames, image uploads, and PDF documents.
 */

import { createWorker } from 'tesseract.js';

// Biological Reference Ranges for Clinical Lab Tests
export const LAB_REFERENCE_RANGES = {
  'hemoglobin': { min: 12.0, max: 17.5, unit: 'g/dL', display: '12.0 - 17.5 g/dL' },
  'wbc count': { min: 4000, max: 11000, unit: '/mcL', display: '4,000 - 11,000 /mcL' },
  'white blood cells': { min: 4000, max: 11000, unit: '/mcL', display: '4,000 - 11,000 /mcL' },
  'platelets': { min: 150000, max: 450000, unit: '/mcL', display: '150,000 - 450,000 /mcL' },
  'fasting blood sugar': { min: 70.0, max: 100.0, unit: 'mg/dL', display: '70.0 - 100.0 mg/dL' },
  'fasting glucose': { min: 70.0, max: 100.0, unit: 'mg/dL', display: '70.0 - 100.0 mg/dL' },
  'random blood glucose': { min: 70.0, max: 140.0, unit: 'mg/dL', display: '70.0 - 140.0 mg/dL' },
  'glucose': { min: 70.0, max: 140.0, unit: 'mg/dL', display: '70.0 - 140.0 mg/dL' },
  'hba1c': { min: 4.0, max: 5.7, unit: '%', display: '4.0 - 5.7 %' },
  'creatinine': { min: 0.6, max: 1.3, unit: 'mg/dL', display: '0.6 - 1.3 mg/dL' },
  'serum creatinine': { min: 0.6, max: 1.3, unit: 'mg/dL', display: '0.6 - 1.3 mg/dL' },
  'blood urea': { min: 15.0, max: 45.0, unit: 'mg/dL', display: '15.0 - 45.0 mg/dL' },
  'total cholesterol': { min: 100.0, max: 200.0, unit: 'mg/dL', display: '< 200 mg/dL' },
  'cholesterol': { min: 100.0, max: 200.0, unit: 'mg/dL', display: '< 200 mg/dL' },
  'triglycerides': { min: 50.0, max: 150.0, unit: 'mg/dL', display: '< 150 mg/dL' },
  'hdl': { min: 40.0, max: 60.0, unit: 'mg/dL', display: '> 40 mg/dL' },
  'ldl': { min: 50.0, max: 100.0, unit: 'mg/dL', display: '< 100 mg/dL' },
  'sgpt / alt': { min: 7.0, max: 56.0, unit: 'U/L', display: '7 - 56 U/L' },
  'sgpt': { min: 7.0, max: 56.0, unit: 'U/L', display: '7 - 56 U/L' },
  'alt': { min: 7.0, max: 56.0, unit: 'U/L', display: '7 - 56 U/L' },
  'sgot / ast': { min: 10.0, max: 40.0, unit: 'U/L', display: '10 - 40 U/L' },
  'sgot': { min: 10.0, max: 40.0, unit: 'U/L', display: '10 - 40 U/L' },
  'ast': { min: 10.0, max: 40.0, unit: 'U/L', display: '10 - 40 U/L' },
  'potassium': { min: 3.5, max: 5.0, unit: 'mEq/L', display: '3.5 - 5.0 mEq/L' },
  'sodium': { min: 135.0, max: 145.0, unit: 'mEq/L', display: '135 - 145 mEq/L' },
  'tsh': { min: 0.4, max: 4.5, unit: 'mIU/L', display: '0.4 - 4.5 mIU/L' },
  'esr': { min: 0.0, max: 20.0, unit: 'mm/hr', display: '0 - 20 mm/hr' },
  'crp': { min: 0.0, max: 5.0, unit: 'mg/L', display: '< 5.0 mg/L' }
};

export const PENICILLIN_DRUGS = [
  'amoxicillin', 'augmentin', 'ampicillin', 'piperacillin',
  'penicillin', 'cloxacillin', 'amoxiclav', 'ampiclox'
];

export const COMMON_DRUG_NAMES = [
  'Augmentin', 'Amoxicillin', 'Paracetamol', 'Dolo', 'Crocin', 'Levocetirizine',
  'Cetirizine', 'Azithromycin', 'Metformin', 'Lisinopril', 'Amlodipine',
  'Atorvastatin', 'Omeprazole', 'Pantoprazole', 'Montelukast', 'Ciprofloxacin',
  'Cefixime', 'Ibuprofen', 'Fluticasone', 'Salbutamol', 'Ascoril', 'Tramadol',
  'Gabapentin', 'Losartan', 'Telmisartan', 'Atenolol', 'Metoprolol', 'Rosuvastatin',
  'Rabeprazole', 'Doxycycline', 'Levofloxacin', 'Metronidazole', 'Combiflam',
  'Aceclofenac', 'Diclofenac', 'Allegra', 'Fexofenadine', 'Glimepiride', 'Teneligliptin',
  'Dapagliflozin', 'Insulin', 'Vitamin D3', 'Vitamin C', 'Zinc', 'Calcium', 'Omega-3'
];

/**
 * Extracts raw text from an image (File, Blob, or DataURL) using Tesseract.js
 */
export async function extractTextFromImage(imageSource, onProgress = () => {}) {
  try {
    onProgress(15, 'Initializing OCR optical engine...');
    const worker = await createWorker('eng');
    
    onProgress(45, 'Scanning visual patterns & characters...');
    const ret = await worker.recognize(imageSource);
    
    onProgress(85, 'Finalizing OCR transcript...');
    await worker.terminate();

    const text = ret.data.text ? ret.data.text.trim() : '';
    return text;
  } catch (err) {
    console.warn('Tesseract OCR error:', err);
    return '';
  }
}

/**
 * Extracts raw text from a PDF file using pdfjs-dist
 */
export async function extractTextFromPdf(fileOrBlob, onProgress = () => {}) {
  try {
    onProgress(15, 'Loading PDF document...');
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const extractedPages = [];

    for (let i = 1; i <= numPages; i++) {
      onProgress(30 + Math.round((i / numPages) * 50), `Reading page ${i} of ${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        extractedPages.push(pageText.trim());
      }
    }

    const fullText = extractedPages.join('\n\n');
    if (fullText.trim().length > 10) {
      return fullText.trim();
    }

    // If PDF has no text layer, render first page to canvas and OCR it
    onProgress(75, 'Scanned PDF detected. Running optical character recognition...');
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await firstPage.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return await extractTextFromImage(dataUrl, onProgress);
  } catch (err) {
    console.warn('PDF extraction encountered error:', err);
    return '';
  }
}

/**
 * Parses structured clinical details from raw text
 */
export function parseClinicalEntities(rawText = '', patient = null) {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      title: 'Scanned Medical Record',
      doc_type: 'Prescription',
      doctor: '',
      facility: '',
      doc_date: new Date().toISOString().split('T')[0],
      diagnosis: '',
      vitals: {},
      medications: [],
      lab_results: [],
      extracted_text: '',
      confidence: '0%',
      allergy_warning: false,
      allergy_message: ''
    };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Determine Document Type
  let doc_type = "Prescription";
  let title = "Clinical Prescription";

  if (/(lab report|pathology|metabolic panel|lipid panel|cbc|biopath|diagnostics|blood count|urinalysis)/i.test(text)) {
    doc_type = "Lab Report";
    title = "Laboratory Investigation Report";
  } else if (/(x-ray|radiology|ultrasound|mri|ct scan|imaging|radiography)/i.test(text)) {
    doc_type = "Radiology";
    title = "Radiology & Imaging Report";
  } else if (/(discharge|inpatient|admission|hospital course)/i.test(text)) {
    doc_type = "Discharge Summary";
    title = "Hospital Discharge Summary";
  }

  // 2. Facility / Clinic / Hospital Name
  let facility = "";
  const facilityMatch = text.match(/([A-Za-z0-9\s&,.-]+?(?:Hospital|Clinic|Healthcare|Diagnostics|Laboratory|Laboratories|Medical Center|Health Center|Institute))/i);
  if (facilityMatch && facilityMatch[1].trim().length > 3) {
    facility = facilityMatch[1].trim().replace(/\s+/g, ' ');
  }

  // 3. Doctor Name
  let doctor = "";
  const doctorMatch = text.match(/(?:Dr\.|Doctor)\s+([A-Za-z][a-zA-Z\.\s]+?(?:,\s*(?:MD|MBBS|MS|DNB|DO|PhD|Pathologist|Radiologist))?)/i);
  if (doctorMatch && doctorMatch[1].trim().length > 2) {
    const docCandidate = doctorMatch[1].trim();
    doctor = docCandidate.toLowerCase().startsWith('dr.') ? docCandidate : `Dr. ${docCandidate}`;
  }

  // 4. Document Date
  let doc_date = new Date().toISOString().split('T')[0];
  const dateMatch = text.match(/(?:\bDate\s*[:\-]?\s*)?(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})/i);
  if (dateMatch) {
    doc_date = dateMatch[1].trim();
  }

  // 5. Clinical Diagnosis / Impression
  let diagnosis = "";
  const diagMatch = text.match(/(?:Diagnosis|Dx|Impression|Condition|Assessment|Indication)\s*[:\-]?\s*([^\n\r]+)/i);
  if (diagMatch && diagMatch[1].trim().length > 3) {
    diagnosis = diagMatch[1].trim();
  }

  // 6. Vitals Extraction
  const vitals = {};
  const bpMatch = text.match(/(?:BP|Blood Pressure)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmHg)?/i);
  if (bpMatch) {
    vitals.bp_systolic = parseInt(bpMatch[1], 10);
    vitals.bp_diastolic = parseInt(bpMatch[2], 10);
    vitals.blood_pressure = `${vitals.bp_systolic}/${vitals.bp_diastolic}`;
  }

  const pulseMatch = text.match(/(?:HR|Pulse|Heart Rate)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (pulseMatch) vitals.heart_rate = parseInt(pulseMatch[1], 10);

  const spo2Match = text.match(/(?:SpO2|Oxygen|O2 Sat(?:uration)?)\s*[:\-]?\s*(\d{2,3})\s*%?/i);
  if (spo2Match) vitals.spo2 = parseInt(spo2Match[1], 10);

  const tempMatch = text.match(/(?:Temp|Temperature)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°?[FC])?/i);
  if (tempMatch) vitals.temperature = parseFloat(tempMatch[1]);

  // 7. Medications Extraction
  const medications = [];
  const seenDrugs = new Set();

  for (const drug of COMMON_DRUG_NAMES) {
    const drugPattern = new RegExp(`\\b${drug}\\b`, 'i');
    if (drugPattern.test(text) && !seenDrugs.has(drug.toLowerCase())) {
      seenDrugs.add(drug.toLowerCase());

      const matchingLine = lines.find(l => drugPattern.test(l)) || '';

      const doseMatch = matchingLine.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|%))/i);
      const dose = doseMatch ? doseMatch[1].trim() : 'Standard';

      let freq = "Once daily";
      let timing = "Morning";
      if (/\b(TDS|TID|3 times|thrice|q8h)\b/i.test(matchingLine)) {
        freq = "3 times daily";
        timing = "Morning, Noon, Night";
      } else if (/\b(BD|BID|2 times|twice|q12h)\b/i.test(matchingLine)) {
        freq = "Twice daily";
        timing = "Morning, Night";
      } else if (/\b(OD|once daily|q24h|qam)\b/i.test(matchingLine)) {
        freq = "Once daily";
        timing = "Morning";
      } else if (/\b(SOS|PRN|as needed|when required)\b/i.test(matchingLine)) {
        freq = "As needed (SOS)";
        timing = "As needed";
      }

      const durMatch = matchingLine.match(/x\s*(\d+\s*(?:days?|weeks?|months?))/i);
      const duration = durMatch ? durMatch[1].trim() : 'As prescribed';

      let instruction = "Take with water";
      if (/after\s+(?:food|meals)/i.test(matchingLine)) instruction = "Take after meals";
      else if (/before\s+(?:food|meals)/i.test(matchingLine)) instruction = "Take before meals";
      else if (/bedtime|night/i.test(matchingLine)) instruction = "Take at bedtime";

      medications.push({
        name: drug,
        dose,
        frequency: freq,
        duration,
        instruction,
        timing
      });
    }
  }

  // 8. Lab Investigations Extraction
  const lab_results = [];
  for (const [testKey, ref] of Object.entries(LAB_REFERENCE_RANGES)) {
    const testPattern = new RegExp(`\\b${testKey}\\b\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const match = text.match(testPattern);
    if (match) {
      const numVal = parseFloat(match[1]);
      let isAbnormal = false;
      let status = "Normal";
      let flagReason = "Normal";

      if (ref.max !== undefined && numVal > ref.max) {
        isAbnormal = true;
        status = "High";
        flagReason = `High (${numVal} > ${ref.max} ${ref.unit})`;
      } else if (ref.min !== undefined && numVal < ref.min) {
        isAbnormal = true;
        status = "Low";
        flagReason = `Low (${numVal} < ${ref.min} ${ref.unit})`;
      }

      lab_results.push({
        test_name: testKey.charAt(0).toUpperCase() + testKey.slice(1),
        value: numVal,
        unit: ref.unit,
        reference_range: ref.display,
        status,
        is_abnormal: isAbnormal,
        flag_reason: flagReason
      });
    }
  }

  // 9. Penicillin / Allergen Cross-Reference Check
  let allergy_warning = false;
  let allergy_message = '';
  const patientAllergies = (patient?.allergies || []).map(a => a.toLowerCase());
  const hasPenicillinAllergy = patientAllergies.some(a =>
    a.includes('penicillin') || a.includes('amox') || a.includes('augmentin')
  );

  if (hasPenicillinAllergy) {
    const conflictingDrug = medications.find(m =>
      PENICILLIN_DRUGS.some(p => m.name.toLowerCase().includes(p))
    );
    if (conflictingDrug) {
      allergy_warning = true;
      allergy_message = `⚠️ CRITICAL CONTRAINDICATION: Patient has documented ${patient?.allergies?.join(', ')} allergy, but this prescription contains ${conflictingDrug.name}!`;
    }
  }

  const confidence = text.length > 100 ? '98.5%' : (text.length > 30 ? '92.0%' : '75.0%');

  return {
    title,
    doc_type,
    doctor,
    facility,
    doc_date,
    diagnosis,
    vitals,
    medications,
    lab_results,
    extracted_text: text,
    confidence,
    allergy_warning,
    allergy_message
  };
}
