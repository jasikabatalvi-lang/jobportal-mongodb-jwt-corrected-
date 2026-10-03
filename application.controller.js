import mongoose from "mongoose";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";

export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    const application = await Application.create({
      job: jobId,
      applicant: userId,
    });

    job.applications.push(application._id);
    await job.save();

    return res.status(201).json({
      success: true,
      message: "Job applied successfully.",
      application,
    });
  } catch (error) {
    console.error("APPLY JOB ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to apply for job.",
    });
  }
};

export const getAppliedJobs = async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.id,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "job",
        populate: {
          path: "company",
        },
      });

    return res.status(200).json({
      success: true,
      application: applications,
    });
  } catch (error) {
    console.error("GET APPLIED JOBS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch applications.",
    });
  }
};

export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: jobId,
      created_by: req.id,
    }).populate({
      path: "applications",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "applicant",
        select: "-password",
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not owned by you.",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("GET APPLICANTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch applicants.",
    });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.id;

    if (!["accepted", "rejected", "pending"].includes(String(status).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted, rejected or pending.",
      });
    }

    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    const job = await Job.findOne({
      _id: application.job,
      created_by: req.id,
    });

    if (!job) {
      return res.status(403).json({
        success: false,
        message: "You can only update applications for your own jobs.",
      });
    }

    application.status = String(status).toLowerCase();
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully.",
      application,
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update application status.",
    });
  }
};
