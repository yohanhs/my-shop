import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Alineado con `seedDefaultAuth` en Electron: solo SuperAdmin y Cajero. */
const ROLES = ['SuperAdmin', 'Cajero'] as const;

const DEFAULT_ADMIN = {
  nombre: 'Super administrador',
  username: 'admin',
  password: 'admin123',
};

async function main() {
  console.log('Seeding database...');

  // Crear roles
  for (const rolNombre of ROLES) {
    await prisma.rol.upsert({
      where: { nombre: rolNombre },
      update: {},
      create: { nombre: rolNombre },
    });
    console.log(`  Rol "${rolNombre}" creado/verificado.`);
  }

  const superRol = await prisma.rol.findUnique({ where: { nombre: 'SuperAdmin' } });
  if (!superRol) {
    throw new Error('No se encontró el rol SuperAdmin');
  }

  const existingAdmin = await prisma.usuario.findUnique({
    where: { username: DEFAULT_ADMIN.username },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

    await prisma.usuario.create({
      data: {
        nombre: DEFAULT_ADMIN.nombre,
        username: DEFAULT_ADMIN.username,
        passwordHash,
        rolId: superRol.id,
        status: 'ACTIVE',
      },
    });
    console.log(`  Usuario por defecto creado (user: ${DEFAULT_ADMIN.username}, pass: ${DEFAULT_ADMIN.password})`);
  } else {
    console.log('  Usuario admin ya existe, omitiendo.');
  }

  // Crear configuración por defecto
  const configCount = await prisma.configuracion.count();
  if (configCount === 0) {
    await prisma.configuracion.create({
      data: {
        nombreTienda: 'Mi Tienda',
        moneda: 'MXN',
        impuestoPorcentaje: 16,
      },
    });
    console.log('  Configuración por defecto creada.');
  }

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
