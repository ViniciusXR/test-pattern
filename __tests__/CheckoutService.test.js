import { CheckoutService } from '../src/services/CheckoutService.js';
import { Pedido } from '../src/domain/Pedido.js';
import { Item } from '../src/domain/Item.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { UserMother } from './builders/UserMother.js';

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null', async () => {
            const carrinho = new CarrinhoBuilder().build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false }),
            };

            const repositoryDummy = {
                salvar: jest.fn(),
            };

            const emailDummy = {
                enviarEmail: jest.fn(),
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryDummy,
                emailDummy
            );

            const cartaoCredito = { numero: '4111111111111111' };

            const pedido = await checkoutService.processarPedido(
                carrinho,
                cartaoCredito
            );

            expect(pedido).toBeNull();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar desconto e enviar email', async () => {
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comItens([new Item('Item Especial', 200)])
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true }),
            };

            const pedidoSalvo = new Pedido(123, carrinho, 180, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo),
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(undefined),
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const cartaoCredito = { numero: '4111111111111111' };

            const pedido = await checkoutService.processarPedido(
                carrinho,
                cartaoCredito
            );

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 123 no valor de R$180'
            );
            expect(pedido).toBe(pedidoSalvo);
        });
    });
});
