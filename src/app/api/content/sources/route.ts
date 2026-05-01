import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentAgent } from '@/services/content-agent';

export async function GET() {
  try {
    const sources = await prisma.contentSource.findMany({
      include: {
        subject: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type, subjectId, config } = body;

    if (!name || !url || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, url, type' },
        { status: 400 }
      );
    }

    const validTypes = ['RSS', 'API', 'WEBSITE', 'YOUTUBE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const source = await prisma.contentSource.create({
      data: {
        name,
        url,
        type,
        subjectId: subjectId || null,
        config: config || null,
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Content source added successfully',
      data: source,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A source with this URL already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add content source' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: 'Source ID is required' },
        { status: 400 }
      );
    }

    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Content source removed successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to remove content source' },
      { status: 500 }
    );
  }
}