const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema(
  {
    cnic: { type: String, required: true, trim: true, index: true },
    applicantName: { type: String, required: true, trim: true },
    businessSubSector: { type: String, default: '', trim: true },
    mfiBankName: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

// Store CNIC digits-only for fast, format-independent lookup
MemberSchema.index({ cnicDigits: 1 });
MemberSchema.pre('save', function (next) {
  this.cnicDigits = (this.cnic || '').replace(/\D/g, '');
  next();
});
MemberSchema.add({ cnicDigits: { type: String, index: true } });

module.exports = mongoose.model('Member', MemberSchema);
