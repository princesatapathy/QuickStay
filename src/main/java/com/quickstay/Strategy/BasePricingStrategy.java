package com.quickstay.Strategy;

import com.quickstay.Entities.InventoryEntity;

import java.math.BigDecimal;

public class BasePricingStrategy implements PricingStrategy{
    @Override
    public BigDecimal calculatePrice(InventoryEntity inventory) {
        return inventory.getRoom().getBasePrice();
    }
}
