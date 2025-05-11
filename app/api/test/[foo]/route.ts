import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { params: { foo: string } }) {
  return NextResponse.json({ foo: context.params.foo });
} 