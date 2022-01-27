import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const findProduct = async (productId: number) => {
    return cart.filter(product => product.id === productId)[0]
  } 

  const addProduct = async (productId: number) => {
    try {
      let productInCart = await findProduct(productId);

      if (productInCart) {
        if(await validStock(productId, productInCart.amount + 1)) {
          updateProductAmount({
            productId: productId,
            amount: productInCart.amount + 1
          })
        }       
      } else {
        await api.get<Product>(`products/${productId}`)
        .then(response => {
          let local = [
            ...cart,
            {
              ...response.data,
              amount: 1
            }
          ]
          setCart(local)
          updateLocalStorage(local);
        })
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      if(cart.filter(product => product.id === productId).length > 0) {
        let local = cart.filter(p => p.id !== productId);
        setCart(local)
        updateLocalStorage(local);
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(await findProduct(productId) && amount > 0) {
        let index = cart.findIndex(p => p.id === productId)
      
        if (await validStock(cart[index].id, amount)) {
          cart[index].amount = amount;
          let local = [...cart];
          setCart(local)
          updateLocalStorage(local);        
        }
      } else {
        toast.error('Erro na alteração de quantidade do produto');
      }
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  const validStock = async (productId:number, amount:number) => {
    let result = true;
    await api.get<Stock>(`stock/${productId}`)
      .then(response => {
        const stock = response.data;

        if (stock.id !== productId || amount > stock.amount ) {
          toast.error('Quantidade solicitada fora de estoque');
          result = false;
        }
      });
    return result;
  }

  const updateLocalStorage = async (updatedCart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
