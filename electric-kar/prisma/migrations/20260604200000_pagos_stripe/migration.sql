-- Pagos (Stripe) en Pedido
ALTER TABLE "Pedido" ADD COLUMN "pagado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pedido" ADD COLUMN "stripeSessionId" TEXT;
