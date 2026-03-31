import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await db.rewardRedemption.deleteMany();
  await db.transaction.deleteMany();
  await db.notificationQueue.deleteMany();
  await db.reward.deleteMany();
  await db.customer.deleteMany();
  await db.businessSettings.deleteMany();
  await db.staff.deleteMany();
  await db.business.deleteMany();

  const passwordHash = await hashPassword('demo1234');

  // =====================
  // Business 1: Café del Valle
  // =====================
  const business1 = await db.business.create({
    data: {
      name: 'Café del Valle',
      slug: 'cafe-del-valle-x7k2m',
      description: 'Café artesanal de especialidad con los mejores granos latinoamericanos',
      email: 'contacto@cafedelvalle.com',
      phone: '+52 555 123 4567',
      address: 'Av. Reforma 234, Col. Centro, CDMX',
      color: '#d97706',
    },
  });

  await db.businessSettings.create({
    data: {
      businessId: business1.id,
      pointsPerPurchase: 2,
      rewardGoal: 10,
      notifyOnReward: true,
      emailEnabled: true,
    },
  });

  const admin1 = await db.staff.create({
    data: {
      name: 'María García',
      email: 'maria@cafedelvalle.com',
      passwordHash,
      role: 'admin',
      businessId: business1.id,
    },
  });

  const staff1 = await db.staff.create({
    data: {
      name: 'Carlos López',
      email: 'carlos@cafedelvalle.com',
      passwordHash,
      role: 'staff',
      businessId: business1.id,
    },
  });

  // Rewards for Business 1
  const reward1_1 = await db.reward.create({
    data: { name: 'Café Gratis', description: 'Un café de especialidad gratis', requiredPoints: 10, businessId: business1.id },
  });
  const reward1_2 = await db.reward.create({
    data: { name: 'Brownie Artesanal', description: 'Un brownie con nueces hecho en casa', requiredPoints: 20, businessId: business1.id },
  });
  const reward1_3 = await db.reward.create({
    data: { name: 'Descuento 25%', description: '25% de descuento en tu próxima compra', requiredPoints: 30, businessId: business1.id },
  });

  // Customers for Business 1
  const customers1 = [
    { name: 'Ana Rodríguez', email: 'ana@email.com', phone: '+52 555 111 2222' },
    { name: 'Pedro Martínez', email: 'pedro@email.com', phone: '+52 555 333 4444' },
    { name: 'Laura Sánchez', email: 'laura@email.com', phone: '+52 555 555 6666' },
    { name: 'Diego Torres', email: 'diego@email.com', phone: null },
    { name: 'Sofía Hernández', email: 'sofia@email.com', phone: '+52 555 777 8888' },
    { name: 'Miguel Ángel Ruiz', email: 'miguel@email.com', phone: '+52 555 999 0000' },
    { name: 'Valentina Morales', email: 'valentina@email.com', phone: null },
    { name: 'Andrés Jiménez', email: 'andres@email.com', phone: '+52 555 222 3333' },
  ];

  const createdCustomers1: { id: string; points: number; visits: number }[] = [];

  for (const c of customers1) {
    const visits = Math.floor(Math.random() * 15) + 2;
    const points = visits * 2;
    const customer = await db.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalPoints: points,
        visitsCount: visits,
        businessId: business1.id,
      },
    });
    createdCustomers1.push({ id: customer.id, points, visits });
  }

  // Transactions for Business 1
  for (const customer of createdCustomers1) {
    const numTransactions = Math.min(customer.visits, 8);
    for (let i = 0; i < numTransactions; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

      await db.transaction.create({
        data: {
          type: 'earn',
          points: 2,
          description: i < numTransactions - 1 ? 'Compra registrada' : 'Visita reciente',
          customerId: customer.id,
          businessId: business1.id,
          staffId: i % 2 === 0 ? admin1.id : staff1.id,
          createdAt: date,
        },
      });
    }
  }

  // Redemption for top customer
  if (createdCustomers1[0].points >= reward1_1.requiredPoints) {
    const tx = await db.transaction.create({
      data: {
        type: 'redeem',
        points: -reward1_1.requiredPoints,
        description: `Recompensa: ${reward1_1.name}`,
        customerId: createdCustomers1[0].id,
        businessId: business1.id,
        staffId: admin1.id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
    await db.rewardRedemption.create({
      data: {
        customerId: createdCustomers1[0].id,
        rewardId: reward1_1.id,
        transactionId: tx.id,
        redeemedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // =====================
  // Business 2: Librería Páginas
  // =====================
  const business2 = await db.business.create({
    data: {
      name: 'Librería Páginas',
      slug: 'libreria-paginas-q9w4e',
      description: 'Tu rincón literario favorito. Más de 10,000 títulos disponibles.',
      email: 'info@libreriapaginas.com',
      phone: '+52 33 1234 5678',
      address: 'Calle Hidalgo 78, Guadalajara, JAL',
      color: '#16a34a',
    },
  });

  await db.businessSettings.create({
    data: {
      businessId: business2.id,
      pointsPerPurchase: 1,
      rewardGoal: 15,
      notifyOnReward: true,
      emailEnabled: false,
      whatsappEnabled: true,
    },
  });

  await db.staff.create({
    data: {
      name: 'Roberto Vargas',
      email: 'roberto@libreriapaginas.com',
      passwordHash,
      role: 'admin',
      businessId: business2.id,
    },
  });

  // Rewards for Business 2
  await db.reward.create({
    data: { name: '10% de Descuento', description: '10% de descuento en cualquier libro', requiredPoints: 15, businessId: business2.id },
  });
  await db.reward.create({
    data: { name: 'Libro de Regalo', description: 'Un libro de bolsillo gratis (hasta $200)', requiredPoints: 30, businessId: business2.id },
  });

  // Customers for Business 2
  const customers2 = [
    { name: 'Gabriela Flores', email: 'gabriela@email.com', phone: '+52 33 111 2222' },
    { name: 'Ricardo Medina', email: 'ricardo@email.com', phone: null },
    { name: 'Patricia Luna', email: 'patricia@email.com', phone: '+52 33 333 4444' },
    { name: 'Fernando Castro', email: 'fernando@email.com', phone: '+52 33 555 6666' },
    { name: 'Carmen Delgado', email: 'carmen@email.com', phone: null },
  ];

  for (const c of customers2) {
    const visits = Math.floor(Math.random() * 10) + 1;
    await db.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalPoints: visits,
        visitsCount: visits,
        businessId: business2.id,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📊 Demo accounts:');
  console.log('');
  console.log('☕ Café del Valle:');
  console.log('   Admin: maria@cafedelvalle.com / demo1234');
  console.log('   Staff: carlos@cafedelvalle.com / demo1234');
  console.log('   Customers: 8 | Rewards: 3 | Transactions: ~60');
  console.log('');
  console.log('📚 Librería Páginas:');
  console.log('   Admin: roberto@libreriapaginas.com / demo1234');
  console.log('   Customers: 5 | Rewards: 2');
  console.log('');

  await db.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
