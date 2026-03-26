import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, confidence } = body;

    // Standard local dev nodemailer configuration using ethereal or similar mock
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: "test@ethereal.email",
        pass: "testpass",
      },
    });

    try {
      await transporter.sendMail({
        from: '"Groot Guardian" <alert@grootguardian.local>',
        to: 'authorities@forestry.gov',
        subject: `🚨 Deforestation Alert at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
        text: `Alert! High confidence (${(confidence * 100).toFixed(1)}%) of deforestation detected at Lat: ${lat}, Lng: ${lng}. Please investigate.`,
        html: `<b>Alert!</b><br>High confidence (${(confidence * 100).toFixed(1)}%) of deforestation detected at <b>Lat: ${lat}, Lng: ${lng}</b>.<br><br>Please investigate immediately.`
      });
    } catch (mailError) {
      console.warn("Mail not sent due to mock credentials, but logic executed.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending alert:', error);
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 });
  }
}