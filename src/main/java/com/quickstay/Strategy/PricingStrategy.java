package com.quickstay.Strategy;

import com.quickstay.Entities.InventoryEntity;

import java.math.BigDecimal;
public interface PricingStrategy {

    BigDecimal calculatePrice(InventoryEntity inventory);
}
