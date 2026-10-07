import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get('isPublic') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const reviews = await prisma.review.findMany({
      where: {
        isPublic,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            profilePhoto: true,
          }
        },
      }
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, orderId, rating, comment } = body;

    if (!userId || !orderId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if review already exists for this order
    const existingReview = await prisma.review.findUnique({
      where: { orderId }
    });

    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this order' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        orderId,
        rating,
        comment,
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
