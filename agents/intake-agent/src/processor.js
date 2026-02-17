export async function processDocument(text, medicalData) {
  // Additional document processing logic
  const metadata = {
    wordCount: text.split(/\s+/).length,
    characterCount: text.length,
    extractedEntities: {
      allergyCount: medicalData.allergies?.length || 0,
      medicationCount: medicalData.medications?.length || 0,
      conditionCount: medicalData.conditions?.length || 0,
    },
    hasVitals: Object.keys(medicalData.vitals || {}).length > 0,
    processingTimestamp: new Date().toISOString(),
  };

  console.log("Document metadata:", metadata);

  return metadata;
}
