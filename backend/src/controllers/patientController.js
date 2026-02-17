import Patient from "../../../../shared/models/Patient.js";
import Document from "../../../../shared/models/Document.js";
import Diagnostic from "../../../../shared/models/Diagnostic.js";
import BillingProposal from "../../../../shared/models/BillingProposal.js";

export const listPatients = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const patients = await Patient.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Patient.countDocuments();

    res.json({
      patients,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (err) {
    next(err);
  }
};

export const getPatientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (err) {
    next(err);
  }
};

export const getPatientDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docs = await Document.find({ patientId: id }).sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    next(err);
  }
};

export const getPatientDiagnostics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const diagnostics = await Diagnostic.find({ patientId: id }).sort({
      createdAt: -1,
    });

    res.json(diagnostics);
  } catch (err) {
    next(err);
  }
};

export const getPatientBilling = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposals = await BillingProposal.find({ patientId: id }).sort({
      createdAt: -1,
    });

    res.json(proposals);
  } catch (err) {
    next(err);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const patient = await Patient.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (err) {
    next(err);
  }
};
