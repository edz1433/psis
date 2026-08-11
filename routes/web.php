<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HotelBookingController;
use App\Http\Controllers\LoginAuthController;
use App\Http\Controllers\LogsController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PublicHotelBookingController;
use App\Http\Controllers\RentalPaymentController;
use App\Http\Controllers\RentalPropertyController;
use App\Http\Controllers\RentalTenantController;
use App\Http\Controllers\RentalUnitController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\StockManagementController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::prefix('book')->name('public-booking.')->controller(PublicHotelBookingController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/availability', 'availability')->name('availability');
    Route::post('/calculate', 'calculate')->name('calculate');
    Route::post('/', 'store')->name('store');
});

Route::get('/home', function () {
    return Inertia::render('Login');
})->middleware('guest')->name('home');

// Public routes (guest only)
Route::middleware(['guest'])->group(function () {
    Route::get('/', function () {
        return Inertia::render('Login');
    })->name('login');

    Route::get('/login', function () {
        return redirect()->route('login');
    });

    Route::post('/login', [LoginAuthController::class, 'postLogin'])
        ->name('login.post');
});

// Protected routes (authenticated users only)
Route::middleware(['auth'])->group(function () {

    // Dashboard - no specific menu permission required (or use '1' if needed)
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('access:2')->prefix('shop')->name('shop.')->controller(ShopController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/orders', 'orders')->name('orders');
        Route::post('/', 'store')->name('store');
        Route::patch('/orders/{order}', 'update')->name('orders.update');
        Route::post('/orders/{order}/cancel', 'cancel')->name('orders.cancel');
    });

    Route::middleware('access:12')->prefix('pos')->name('pos.')->controller(PosController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');

        Route::get('/history', 'history')->name('history');
        Route::get('/{sale}', 'show')->name('show');
        Route::get('/{sale}/edit', 'edit')->name('edit');
        Route::put('/{sale}', 'update')->name('update');
    });

    // Products - requires menu ID 5 (Products & Categories)
    Route::middleware('access:5')->prefix('products')->name('products.')->controller(ProductController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{product}', 'update')->name('update');
        Route::delete('/{product}', 'destroy')->name('destroy');
        Route::get('/marketplace', 'marketplace')->name('marketplace');
        Route::post('/{product}/buy', 'buy')->name('buy');
    });

    Route::middleware('access:5')->prefix('products/stock-management')->name('products.stock-management.')->controller(StockManagementController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
    });

    // Product Categories - also requires menu ID 5
    Route::middleware('access:5')->prefix('products/categories')->name('category.')->controller(CategoryController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{category}', 'update')->name('update');
        Route::delete('/{category}', 'destroy')->name('destroy');
    });

    // Suppliers - also requires menu ID 5 (since it's under Products)
    Route::middleware('access:5')->prefix('products/suppliers')->name('suppliers.')->controller(SupplierController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{supplier}', 'update')->name('update');
        Route::delete('/{supplier}', 'destroy')->name('destroy');
    });

    Route::middleware('access:5')->prefix('supplier')->name('supplier.')->controller(SalesOrderController::class)->group(function () {
        Route::get('/orders', 'index')->name('orders.index');
        Route::get('/orders/{order}', 'show')->name('orders.show');
        Route::post('/orders/{order}/confirm', 'confirm')->name('orders.confirm');
        Route::post('/orders/{order}/reject', 'reject')->name('orders.reject');
        Route::post('/orders/{order}/shipped', 'shipped')->name('orders.shipped');
        Route::post('/orders/{order}/complete', 'complete')->name('orders.complete');
        Route::get('/orders/{order}/receipt', 'receipt')->name('orders.receipt');
    });

    // Rentals - requires menu ID 4
    Route::middleware('access:4')->prefix('rentals')->name('rentals.')->group(function () {
        // Properties / Units
        Route::controller(RentalPropertyController::class)->prefix('properties')->name('properties.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('/{rentalProperty}', 'update')->name('update');
            Route::delete('/{rentalProperty}', 'destroy')->name('destroy');

            Route::post('/{rentalProperty}/units', [RentalUnitController::class, 'store'])->name('units.store');
            Route::patch('/{rentalProperty}/units/{rentalUnit}', [RentalUnitController::class, 'update'])->name('units.update');
            Route::delete('/{rentalProperty}/units/{rentalUnit}', [RentalUnitController::class, 'destroy'])->name('units.destroy');
        });

        // Tenants & Contracts
        Route::controller(RentalTenantController::class)->prefix('tenants')->name('tenants.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('/{rentalTenant}', 'update')->name('update');
            Route::delete('/{rentalTenant}', 'destroy')->name('destroy');
        });

        // Rental Payments
        Route::controller(RentalPaymentController::class)->prefix('payments')->name('payments.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/print', 'print')->name('print');
            Route::post('/generate', 'generate')->name('generate');
            Route::post('/', 'store')->name('store');
            Route::get('/{rentalPayment}/print', 'printBilling')->name('print.billing');
            Route::patch('/{rentalPayment}', 'update')->name('update');
            Route::delete('/{rentalPayment}', 'destroy')->name('destroy');
        });

    });

    Route::middleware('access:13')->prefix('hotel-bookings')->name('hotel-bookings.')->controller(HotelBookingController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/calculate', 'calculate')->name('calculate');

        Route::post('/buildings', 'storeBuilding')->name('buildings.store');
        Route::patch('/buildings/{hotelBuilding}', 'updateBuilding')->name('buildings.update');
        Route::delete('/buildings/{hotelBuilding}', 'destroyBuilding')->name('buildings.destroy');
        Route::post('/buildings/{hotelBuilding}/images/reorder', 'reorderBuildingImages')->name('buildings.images.reorder');
        Route::post('/building-images/{hotelBuildingImage}/primary', 'primaryBuildingImage')->name('building-images.primary');
        Route::delete('/building-images/{hotelBuildingImage}', 'deleteBuildingImage')->name('building-images.destroy');

        Route::post('/rooms', 'storeRoom')->name('rooms.store');
        Route::patch('/rooms/{hotelRoom}', 'updateRoom')->name('rooms.update');
        Route::delete('/rooms/{hotelRoom}', 'destroyRoom')->name('rooms.destroy');
        Route::post('/rooms/{hotelRoom}/images/reorder', 'reorderRoomImages')->name('rooms.images.reorder');
        Route::post('/room-images/{hotelRoomImage}/primary', 'primaryRoomImage')->name('room-images.primary');
        Route::delete('/room-images/{hotelRoomImage}', 'deleteRoomImage')->name('room-images.destroy');

        Route::post('/facilities', 'storeFacility')->name('facilities.store');
        Route::patch('/facilities/{hotelFacility}', 'updateFacility')->name('facilities.update');
        Route::delete('/facilities/{hotelFacility}', 'destroyFacility')->name('facilities.destroy');
        Route::post('/facilities/{hotelFacility}/images/reorder', 'reorderFacilityImages')->name('facilities.images.reorder');
        Route::post('/facility-images/{hotelFacilityImage}/primary', 'primaryFacilityImage')->name('facility-images.primary');
        Route::delete('/facility-images/{hotelFacilityImage}', 'deleteFacilityImage')->name('facility-images.destroy');

        Route::post('/amenities', 'storeAmenity')->name('amenities.store');
        Route::patch('/amenities/{hotelAmenity}', 'updateAmenity')->name('amenities.update');
        Route::delete('/amenities/{hotelAmenity}', 'destroyAmenity')->name('amenities.destroy');

        Route::post('/packages', 'storePackage')->name('packages.store');
        Route::patch('/packages/{hotelRoomPackage}', 'updatePackage')->name('packages.update');
        Route::delete('/packages/{hotelRoomPackage}', 'destroyPackage')->name('packages.destroy');

        Route::post('/bookings', 'storeBooking')->name('bookings.store');
        Route::patch('/bookings/{hotelBooking}', 'updateBooking')->name('bookings.update');
        Route::delete('/bookings/{hotelBooking}', 'destroyBooking')->name('bookings.destroy');
    });

    // User Management - requires menu ID 8
    Route::middleware('access:8')->prefix('users')->name('users.')->controller(UserController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('/{user}', 'update')->name('update');
        Route::delete('/{user}', 'destroy')->name('destroy');
    });

    // Settings - requires menu ID 9
    Route::middleware('access:9')->controller(SystemSettingController::class)->group(function () {
        Route::get('/settings', 'index')->name('settings');
        Route::post('/settings', 'update')->name('settings.update');
    });

    Route::middleware(['access:10'])->prefix('logs')->name('logs.')->group(function () {
        Route::get('/', [LogsController::class, 'index'])->name('index');
    });

    // Logout (always allowed for authenticated users)
    Route::post('/logout', [LoginAuthController::class, 'postLogout'])
        ->name('logout.post');
});
