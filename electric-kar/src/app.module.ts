import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CfdiModule } from './cfdi/cfdi.module';
import { ClientesModule } from './clientes/clientes.module';
import { ContenidoModule } from './contenido/contenido.module';
import { CuponesModule } from './cupones/cupones.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { MarcasModule } from './marcas/marcas.module';
import { MenuModule } from './menu/menu.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { UploadsModule } from './uploads/uploads.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientesModule,
    CategoriesModule,
    ContenidoModule,
    MarcasModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    CuponesModule,
    CfdiModule,
    IntegracionesModule,
    AuditoriaModule,
    SesionesModule,
    MenuModule,
    NewsletterModule,
    UploadsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
