
import { jsPDF } from "jspdf";
import { MCQ, UserProfile, MockTestResult } from "./types";

export const generateOMRPDF = (user: UserProfile, questions: MCQ[], result: MockTestResult) => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  
  // Header Branding
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, width, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("SMARTEDUKMR MOCK TEST", width / 2, 22, { align: "center" });
  doc.setFontSize(10);
  doc.text("Realistic Entrance Examination Report", width / 2, 30, { align: "center" });
  doc.setFontSize(12);
  doc.text(`${result.examType} PATTERN | ${new Date(result.date).toLocaleDateString()}`, width / 2, 40, { align: "center" });

  // Aspirant Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.text(`Aspirant Name: ${user.name.toUpperCase()}`, 20, 65);
  doc.text(`Registration ID: SEK-${result.sessionId.slice(-8).toUpperCase()}`, 20, 72);
  doc.text(`Exam Stream: ${result.examType}`, 20, 79);

  // Score Table
  doc.setFillColor(241, 245, 249);
  doc.rect(width - 80, 60, 60, 30, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(width - 80, 60, 60, 30, 'S');
  doc.setFontSize(10);
  doc.text(`Final Score: ${result.score}/${result.total}`, width - 75, 68);
  doc.text(`Accuracy: ${result.accuracy}%`, width - 75, 75);
  doc.text(`Readiness: ${result.readinessPercentage}%`, width - 75, 82);

  // OMR Sheet Header
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.5);
  doc.line(20, 95, width - 20, 95);
  doc.setFontSize(9);
  doc.text("DIGITAL OMR RESPONSE SHEET", 20, 102);

  // OMR Bubbles Grid
  const startX = 25;
  const startY = 115;
  const colGap = 45;
  const rowHeight = 9;
  const bubbleSize = 1.8;

  questions.forEach((q, i) => {
    const col = Math.floor(i / 15);
    const row = i % 15;
    const x = startX + (col * colGap);
    const y = startY + (row * rowHeight);

    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${(i + 1).toString().padStart(2, '0')}.`, x - 8, y);

    for (let opt = 0; opt < 4; opt++) {
      const bx = x + (opt * 8);
      const isSelected = q.userAnswer === opt;
      
      if (isSelected) {
        doc.setFillColor(30, 41, 59); // Dark blue-grey fill
        doc.circle(bx, y - 0.8, bubbleSize, 'F');
      } else {
        doc.setDrawColor(30, 41, 59);
        doc.circle(bx, y - 0.8, bubbleSize, 'S');
      }
      
      doc.setFontSize(5);
      doc.setTextColor(isSelected ? 255 : 51);
      doc.text(String.fromCharCode(65 + opt), bx - 0.5, y - 0.5);
    }
  });

  // Disclaimer & Signature
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This report is generated automatically by the SmartEduKMR AI Engine.", 20, 260);
  
  doc.setDrawColor(15, 118, 110);
  doc.line(width - 75, 270, width - 20, 270);
  doc.setFontSize(11);
  doc.setTextColor(15, 118, 110);
  doc.text("SHEIKH ARHAAN HUSSAIN", width - 75, 276);
  doc.setFontSize(9);
  doc.text("Founder & CEO, SmartEduKMR", width - 75, 281);

  const pdfBlob = doc.output('blob');
  doc.save(`${user.name}_SEK_OMR.pdf`);
  return pdfBlob;
};

export const generatePDFReport = (user: UserProfile, questions: MCQ[], title: string = "Session Analytics") => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("SMART EDUCATION KASHMIR", 20, 25);
  doc.setFontSize(10);
  doc.text(title, 20, 32);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Student: ${user.name} | Date: ${new Date().toLocaleDateString()}`, 20, 50);
  doc.save(`${user.name.replace(/\s+/g, '_')}_Report.pdf`);
};

export const generateCertificatePDF = (user: UserProfile): Blob => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, width, height, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(5, 5, width - 10, height - 10, 'F');
  doc.setDrawColor(245, 158, 11); 
  doc.setLineWidth(1.5);
  doc.rect(10, 10, width - 20, height - 20, 'S');
  doc.setLineWidth(0.5);
  doc.rect(12, 12, width - 24, height - 24, 'S');
  doc.setFillColor(245, 158, 11);
  doc.circle(10, 10, 3, 'F');
  doc.circle(width - 10, 10, 3, 'F');
  doc.circle(10, height - 10, 3, 'F');
  doc.circle(width - 10, height - 10, 3, 'F');

  doc.setTextColor(15, 118, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("SMART EDUCATION KASHMIR", width / 2, 45, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.text("ACADEMY OF EXCELLENCE", width / 2, 53, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 85);
  doc.text("Certificate of Achievement", width / 2, 75, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("This is to solemnly certify that", width / 2, 90, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(15, 23, 42);
  doc.text(user.name.toUpperCase(), width / 2, 115, { align: "center" });

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1);
  doc.line(width / 2 - 80, 118, width / 2 + 80, 118);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  const desc = "has successfully demonstrated exceptional perseverance, academic discipline, and psychological resilience in the Competitive Entrance preparatory stream of Jammu & Kashmir.";
  const lines = doc.splitTextToSize(desc, 180);
  doc.text(lines, width / 2, 135, { align: "center" });

  doc.setDrawColor(15, 118, 110);
  doc.line(width / 2 - 35, 185, width / 2 + 35, 185);
  doc.setFontSize(14);
  doc.setTextColor(15, 118, 110);
  doc.setFont("helvetica", "bold");
  doc.text("SHEIKH ARHAAN HUSSAIN", width / 2, 192, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("FOUNDER & CEO, SMARTEDUKMR", width / 2, 198, { align: "center" });

  doc.setFillColor(245, 158, 11);
  doc.circle(width - 50, height - 50, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("SEK", width - 50, height - 51, { align: "center" });
  doc.text("VERIFIED", width - 50, height - 47, { align: "center" });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 25, height - 20);

  const blob = doc.output('blob');
  doc.save(`${user.name}_SEK_Certificate.pdf`);
  return blob;
};

export const triggerFireworks = () => {
  const container = document.body;
  for (let i = 0; i < 25; i++) {
    const fw = document.createElement("div");
    fw.className = "firework";
    fw.style.left = Math.random() * 100 + "vw";
    fw.style.top = Math.random() * 100 + "vh";
    fw.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
    fw.style.animation = "firework-animation 1.2s cubic-bezier(0, 0, 0.2, 1) forwards";
    container.appendChild(fw);
    setTimeout(() => fw.remove(), 1200);
  }
};

export const playBeep = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.3);
};
