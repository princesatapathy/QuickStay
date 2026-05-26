-- Initial schema for Airbnb backend (PostgreSQL)

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50)
);

CREATE TABLE app_user_roles (
    app_user_id BIGINT NOT NULL,
    roles VARCHAR(50) NOT NULL,
    CONSTRAINT fk_app_user_roles_user FOREIGN KEY (app_user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

CREATE INDEX idx_app_user_roles_user ON app_user_roles (app_user_id);

CREATE TABLE hotel (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    photos TEXT[],
    amenities TEXT[],
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    contact_info_address VARCHAR(255),
    contact_info_phone_number VARCHAR(255),
    contact_info_email VARCHAR(255),
    contact_info_location VARCHAR(255),
    active BOOLEAN NOT NULL,
    owner_id BIGINT NOT NULL,
    CONSTRAINT fk_hotel_owner FOREIGN KEY (owner_id) REFERENCES app_user (id)
);

CREATE INDEX idx_hotel_owner ON hotel (owner_id);

CREATE TABLE room (
    id BIGSERIAL PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    type VARCHAR(255) NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    photos TEXT[],
    amenities TEXT[],
    total_count INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_room_hotel FOREIGN KEY (hotel_id) REFERENCES hotel (id) ON DELETE CASCADE
);

CREATE INDEX idx_room_hotel ON room (hotel_id);

CREATE TABLE guest (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    age INTEGER,
    CONSTRAINT fk_guest_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE INDEX idx_guest_user ON guest (user_id);

CREATE TABLE booking (
    id BIGSERIAL PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    rooms_count INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    booking_status VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_session_id VARCHAR(255) UNIQUE,
    CONSTRAINT fk_booking_hotel FOREIGN KEY (hotel_id) REFERENCES hotel (id),
    CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES room (id),
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES app_user (id)
);

CREATE INDEX idx_booking_user ON booking (user_id);
CREATE INDEX idx_booking_hotel ON booking (hotel_id);

CREATE TABLE booking_guest (
    booking_id BIGINT NOT NULL,
    guest_id BIGINT NOT NULL,
    PRIMARY KEY (booking_id, guest_id),
    CONSTRAINT fk_booking_guest_booking FOREIGN KEY (booking_id) REFERENCES booking (id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_guest_guest FOREIGN KEY (guest_id) REFERENCES guest (id) ON DELETE CASCADE
);

CREATE INDEX idx_booking_guest_guest ON booking_guest (guest_id);

CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    date DATE NOT NULL,
    book_count INTEGER NOT NULL DEFAULT 0,
    reserved_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    surge_factor NUMERIC(5,2) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    city VARCHAR(255) NOT NULL,
    closed BOOLEAN NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT unique_hotel_room_date UNIQUE (hotel_id, room_id, date),
    CONSTRAINT fk_inventory_hotel FOREIGN KEY (hotel_id) REFERENCES hotel (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_room FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE CASCADE
);

CREATE INDEX idx_inventory_room_date ON inventory (room_id, date);
CREATE INDEX idx_inventory_city_date ON inventory (city, date);

CREATE TABLE hotel_min_price (
    id BIGSERIAL PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    date DATE NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_hotel_min_price_hotel FOREIGN KEY (hotel_id) REFERENCES hotel (id) ON DELETE CASCADE
);

CREATE INDEX idx_hotel_min_price_hotel_date ON hotel_min_price (hotel_id, date);

