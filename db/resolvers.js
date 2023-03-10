const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
//const Pedido = require('../models/Pedido');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });


const crearToken = (usuario, secreta, expiresIn) => {
    // console.log(usuario);
    const { id, email,nombre, apellido } = usuario;

    return jwt.sign( { id, email, nombre, apellido }, secreta, { expiresIn } )
}

// Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {}, ctx) => {
            return ctx.usuario;
        }, 
        
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerClientesVendedor: async (_, {}, ctx ) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerCliente: async (_, { id }, ctx) => {
            // Revisar si el cliente existe o no
            const cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Cliente no encontrado');
            }

            // Quien lo creo puede verlo
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            return cliente;
        }, 
        
    }, 
    Mutation: {
        nuevoUsuario: async (_, { input } ) => {

            const { email, password } = input;
            
            // Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({email});
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado');
            }

            // Hashear su password
            const salt = await bcryptjs.genSalt(10);
            input.password = await bcryptjs.hash(password, salt);

            try {
                 // Guardarlo en la base de datos
                const usuario = new Usuario(input);
                usuario.save(); // guardarlo
                return usuario;
            } catch (error) {
                console.log(error);
            }
        }, 
        autenticarUsuario: async (_, {input}) => {

            const { email, password } = input;

            // Si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            if (!existeUsuario) {
                throw new Error('El usuario no existe');
            }

            // Revisar si el password es correcto
            const passwordCorrecto = await bcryptjs.compare( password, existeUsuario.password );
            if(!passwordCorrecto) {
                throw new Error('El Password es Incorrecto');
            }

            // Crear el token
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '8h' ) 
            }
            
        },
        
        nuevoCliente: async (_, { input }, ctx) => {

            console.log(ctx);

            const { email } = input
            // Verificar si el cliente ya esta registrado
            // console.log(input);

            const cliente = await Cliente.findOne({ email });
            if(cliente) {
                throw new Error('Ese cliente ya esta registrado');
            }

            const nuevoCliente = new Cliente(input);

            // asignar el vendedor
            nuevoCliente.vendedor = ctx.usuario.id;

            // guardarlo en la base de datos

            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarCliente: async (_, {id, input}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Ese cliente no existe');
            }

            // Verificar si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // guardar el cliente
            cliente = await Cliente.findOneAndUpdate({_id : id}, input, {new: true} );
            return cliente;
        },
        eliminarCliente : async (_, {id}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Ese cliente no existe');
            }

            // Verificar si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // Eliminar Cliente
            await Cliente.findOneAndDelete({_id : id});
            return "Cliente Eliminado"
        },
        
    }
}

module.exports = resolvers;