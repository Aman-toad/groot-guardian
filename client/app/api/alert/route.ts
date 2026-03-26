import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, confidence, delta_mag } = body;

    // Validate required fields before using them
    if (lat == null || lng == null || confidence == null || delta_mag == null) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: lat, lng, confidence, delta_mag" },
        { status: 400 }
      );
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const confNum = Number(confidence);
    const deltaNum = Number(delta_mag);

    if ([latNum, lngNum, confNum, deltaNum].some(isNaN)) {
      return NextResponse.json(
        { success: false, error: "Invalid numeric values in request body" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "SAR Monitor <onboarding@resend.dev>", 
      to: ["yuvilovi12@gmail.com"], 
      subject: "🚨 ALERT: Deforestation Anomaly Detected!",
      text: `A deforestation anomaly has been detected!

Location: ${latNum.toFixed(6)}, ${lngNum.toFixed(6)}
Confidence: ${(confNum * 100).toFixed(1)}%
Change Magnitude: ${deltaNum.toFixed(4)}

Please investigate immediately.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #ef4444; margin-top: 0;">🚨 Deforestation Anomaly Detected!</h2>
          <p style="color: #475569; font-size: 16px;">A high-confidence deforestation event has been logged by the SAR processing pipeline.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0; margin: 0; color: #334155; font-size: 15px;">
              <li style="margin-bottom: 8px;"><strong>📍 Latitude:</strong> ${latNum.toFixed(6)}</li>
              <li style="margin-bottom: 8px;"><strong>📍 Longitude:</strong> ${lngNum.toFixed(6)}</li>
              <li style="margin-bottom: 8px;"><strong>🎯 Confidence:</strong> ${(confNum * 100).toFixed(1)}%</li>
              <li><strong>⚖️ Change Magnitude:</strong> ${deltaNum.toFixed(4)}</li>
            </ul>
          </div>
          <p style="color: #64748b; font-size: 14px;">Please initialize field verification or review secondary satellite imagery for this coordinate immediately.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Alert sent successfully",
      id: data?.id,
    });
  } catch (error) {
    console.error("Failed to send alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send alert" },
      { status: 500 },
    );
  }
}
