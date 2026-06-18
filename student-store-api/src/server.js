require('dotenv').config()

const express = require('express')
const cors = require('cors')

const productRoutes = require('./routes/productRoutes')
const orderRoutes = require('./routes/orderRoutes')
const orderItemRoutes = require('./routes/orderItemRoutes')

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

app.get('/', (req, res) => {
  res.send('Welcome to the Student Store API!')
})

app.use('/products', productRoutes)
app.use('/orders', orderRoutes)
app.use('/order-items', orderItemRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
