"""
Curated Product Catalog
Fallback for when Serper API is unavailable
20 pre-tested products with known-good VTO images
"""

CURATED_CATALOG = [
    # Dresses
    {
        "title": "Reformation Midi Dress - Black",
        "price": "$98",
        "source": "Reformation",
        "link": "https://www.thereformation.com",
        "imageUrl": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
        "category": "dress",
        "rating": 4.5,
    },
    {
        "title": "Everlane Silk Slip Dress - Sage",
        "price": "$128",
        "source": "Everlane",
        "link": "https://www.everlane.com",
        "imageUrl": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400",
        "category": "dress",
        "rating": 4.7,
    },
    {
        "title": "Zara Linen Midi Dress - White",
        "price": "$49",
        "source": "Zara",
        "link": "https://www.zara.com",
        "imageUrl": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400",
        "category": "dress",
        "rating": 4.2,
    },
    
    # Tops
    {
        "title": "Madewell Silk Blouse - Cream",
        "price": "$88",
        "source": "Madewell",
        "link": "https://www.madewell.com",
        "imageUrl": "https://images.unsplash.com/photo-1564257577-4f0b4c8c1e5f?w=400",
        "category": "top",
        "rating": 4.6,
    },
    {
        "title": "COS Cashmere Sweater - Grey",
        "price": "$125",
        "source": "COS",
        "link": "https://www.cosstores.com",
        "imageUrl": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
        "category": "top",
        "rating": 4.8,
    },
    {
        "title": "Uniqlo Cotton Turtleneck - Black",
        "price": "$29",
        "source": "Uniqlo",
        "link": "https://www.uniqlo.com",
        "imageUrl": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400",
        "category": "top",
        "rating": 4.4,
    },
    
    # Bottoms
    {
        "title": "Levi's 501 Jeans - Dark Wash",
        "price": "$98",
        "source": "Levi's",
        "link": "https://www.levi.com",
        "imageUrl": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
        "category": "bottom",
        "rating": 4.7,
    },
    {
        "title": "Aritzia Wool Trousers - Black",
        "price": "$148",
        "source": "Aritzia",
        "link": "https://www.aritzia.com",
        "imageUrl": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
        "category": "bottom",
        "rating": 4.6,
    },
    
    # Jackets
    {
        "title": "Everlane Trench Coat - Beige",
        "price": "$198",
        "source": "Everlane",
        "link": "https://www.everlane.com",
        "imageUrl": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400",
        "category": "jacket",
        "rating": 4.8,
    },
    {
        "title": "Mango Leather Jacket - Black",
        "price": "$149",
        "source": "Mango",
        "link": "https://www.mango.com",
        "imageUrl": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400",
        "category": "jacket",
        "rating": 4.5,
    },
    
    # Accessories - Earrings
    {
        "title": "Mejuri Gold Hoop Earrings",
        "price": "$29",
        "source": "Mejuri",
        "link": "https://www.mejuri.com",
        "imageUrl": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400",
        "category": "accessory",
        "rating": 4.9,
    },
    {
        "title": "Mejuri Pearl Drop Earrings",
        "price": "$48",
        "source": "Mejuri",
        "link": "https://www.mejuri.com",
        "imageUrl": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400",
        "category": "accessory",
        "rating": 4.7,
    },
    
    # Accessories - Necklaces
    {
        "title": "Mejuri Gold Chain Necklace",
        "price": "$58",
        "source": "Mejuri",
        "link": "https://www.mejuri.com",
        "imageUrl": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
        "category": "accessory",
        "rating": 4.8,
    },
    {
        "title": "Catbird Pearl Necklace",
        "price": "$88",
        "source": "Catbird",
        "link": "https://www.catbirdnyc.com",
        "imageUrl": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
        "category": "accessory",
        "rating": 4.9,
    },
    
    # Shoes
    {
        "title": "Sam Edelman Heels - Black",
        "price": "$120",
        "source": "Sam Edelman",
        "link": "https://www.samedelman.com",
        "imageUrl": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
        "category": "shoes",
        "rating": 4.6,
    },
    {
        "title": "Veja Sneakers - White",
        "price": "$150",
        "source": "Veja",
        "link": "https://www.veja-store.com",
        "imageUrl": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
        "category": "shoes",
        "rating": 4.7,
    },
    {
        "title": "Everlane Day Heel - Nude",
        "price": "$145",
        "source": "Everlane",
        "link": "https://www.everlane.com",
        "imageUrl": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
        "category": "shoes",
        "rating": 4.5,
    },
    
    # Bags
    {
        "title": "Cuyana Tote - Black Leather",
        "price": "$195",
        "source": "Cuyana",
        "link": "https://www.cuyana.com",
        "imageUrl": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400",
        "category": "accessory",
        "rating": 4.8,
    },
    {
        "title": "Mansur Gavriel Bucket Bag - Tan",
        "price": "$495",
        "source": "Mansur Gavriel",
        "link": "https://www.mansurgavriel.com",
        "imageUrl": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
        "category": "accessory",
        "rating": 4.9,
    },
    
    # Scarves
    {
        "title": "Everlane Silk Scarf - Floral",
        "price": "$48",
        "source": "Everlane",
        "link": "https://www.everlane.com",
        "imageUrl": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400",
        "category": "accessory",
        "rating": 4.6,
    },
]
